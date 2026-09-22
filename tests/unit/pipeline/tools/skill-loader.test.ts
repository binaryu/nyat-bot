import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSkills } from '../../../../src/pipeline/tools/skill-loader.js';

describe('Skill Loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('loads valid HTTP skill with default values and responseType: text', async () => {
    const skillJson = {
      name: 'MOCK_WEATHER',
      description: 'Mock weather query',
      parameters: {
        city: {
          type: 'string',
          description: 'City name',
          required: false,
          default: '北京',
        },
      },
      trusted: true,
      execute: {
        type: 'http',
        url: 'https://example.com/weather?city={{city}}',
        method: 'GET',
        responseType: 'text',
        allowedHosts: ['example.com'],
      },
    };

    await writeFile(join(tempDir, 'weather.json'), JSON.stringify(skillJson), 'utf-8');

    // Mock global fetch
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '北京: 25°C 晴',
    });
    vi.stubGlobal('fetch', fetchMock);

    const loaded = await loadSkills(tempDir);
    expect(loaded).toHaveProperty('MOCK_WEATHER');

    const result = await loaded.MOCK_WEATHER.tool.execute({}, { messages: [] });
    expect(result).toBe('北京: 25°C 晴');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/weather?city=北京',
      expect.objectContaining({ method: 'GET' }),
    );

    vi.unstubAllGlobals();
  });

  it('renders resultTemplate with JSON response and extracted fields', async () => {
    const skillJson = {
      name: 'MOCK_JSON_WEATHER',
      description: 'Mock json weather',
      parameters: {
        city: {
          type: 'string',
          description: 'City name',
        },
      },
      trusted: true,
      execute: {
        type: 'http',
        url: 'https://example.com/api/weather?city={{city}}',
        method: 'GET',
        responseType: 'json',
        resultPath: 'current',
        resultTemplate: '{{city}}天气: {{weather}}, 温度: {{temp}}°C',
        allowedHosts: ['example.com'],
      },
    };

    await writeFile(join(tempDir, 'json-weather.json'), JSON.stringify(skillJson), 'utf-8');

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({
        current: {
          weather: '多云',
          temp: 22,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const loaded = await loadSkills(tempDir);
    expect(loaded).toHaveProperty('MOCK_JSON_WEATHER');

    const result = await loaded.MOCK_JSON_WEATHER.tool.execute({ city: '上海' }, { messages: [] });
    expect(result).toBe('上海天气: 多云, 温度: 22°C');

    vi.unstubAllGlobals();
  });

  it('rejects invalid skill names or script skills', async () => {
    const invalidNameSkill = {
      name: 'lowercase_name',
      description: 'Invalid name',
      parameters: {},
      execute: {
        type: 'http',
        url: 'https://example.com',
      },
    };
    const scriptSkill = {
      name: 'SCRIPT_TOOL',
      description: 'Script type',
      parameters: {},
      execute: {
        type: 'script',
        command: 'echo',
      },
    };

    await writeFile(join(tempDir, 'invalid.json'), JSON.stringify(invalidNameSkill), 'utf-8');
    await writeFile(join(tempDir, 'script.json'), JSON.stringify(scriptSkill), 'utf-8');

    const loaded = await loadSkills(tempDir);
    expect(loaded).not.toHaveProperty('lowercase_name');
    expect(loaded).not.toHaveProperty('SCRIPT_TOOL');
  });

  it('loads real weather.json skill configuration without errors', async () => {
    const loaded = await loadSkills('./data/skills');
    expect(loaded).toHaveProperty('WEATHER');
    expect(loaded.WEATHER.tool.description).toContain('天气');
  });
});
