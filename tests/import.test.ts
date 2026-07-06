import {describe, expect, test} from 'vitest';
import {parseLayoutJson, sanitizeLayout, SCHEMA_VERSION} from '../src/utils/importSchema';
import {generateLayouts} from '../src/engine/pipeline';
import {applyPreset, presets} from '../src/engine/defaults';

function validLayoutJson(): string {
  const layout = generateLayouts(applyPreset(presets[0]), 10, 7)[0];
  return JSON.stringify({schemaVersion: SCHEMA_VERSION, ...layout});
}

describe('parseLayoutJson', () => {
  test('JSON hợp lệ (v2) nhập được và giữ nguyên hình học', () => {
    const text = validLayoutJson();
    const result = parseLayoutJson(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const original = JSON.parse(text);
      expect(result.layout.floors.length).toBe(original.floors.length);
      const r0 = result.layout.floors[0].rooms[0];
      const o0 = original.floors[0].rooms[0];
      expect([r0.x, r0.y, r0.width, r0.height]).toEqual([o0.x, o0.y, o0.width, o0.height]);
      // issues/score được tính lại chứ không tin dữ liệu trong tệp
      expect(result.layout.score.total).toBeGreaterThanOrEqual(0);
    }
  });

  test('JSON legacy (không có schemaVersion) vẫn nhập được', () => {
    const obj = JSON.parse(validLayoutJson());
    delete obj.schemaVersion;
    const result = parseLayoutJson(JSON.stringify(obj));
    expect(result.ok).toBe(true);
  });

  test('schemaVersion tương lai bị từ chối với thông báo tiếng Việt', () => {
    const obj = JSON.parse(validLayoutJson());
    obj.schemaVersion = 99;
    const result = parseLayoutJson(JSON.stringify(obj));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('phiên bản');
  });

  test('JSON cắt cụt không crash, báo lỗi cú pháp', () => {
    const result = parseLayoutJson(validLayoutJson().slice(0, 50));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('JSON');
  });

  test('không phải object layout → báo lỗi', () => {
    for (const bad of ['null', '42', '"abc"', '[]', '{}']) {
      const result = parseLayoutJson(bad);
      expect(result.ok, `input: ${bad}`).toBe(false);
      if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test('phòng có NaN/kích thước âm bị từ chối với message rõ ràng', () => {
    const obj = JSON.parse(validLayoutJson());
    obj.floors[0].rooms[0].width = -2;
    let result = parseLayoutJson(JSON.stringify(obj));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/kích thước/);

    const obj2 = JSON.parse(validLayoutJson());
    obj2.floors[0].rooms[0].x = 'abc';
    result = parseLayoutJson(JSON.stringify(obj2));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/tọa độ|kích thước/);
  });

  test('loại phòng lạ được quy về storage thay vì crash', () => {
    const obj = JSON.parse(validLayoutJson());
    obj.floors[0].rooms[0].type = 'sauna';
    const result = parseLayoutJson(JSON.stringify(obj));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.layout.floors[0].rooms[0].type).toBe('storage');
  });

  test('kích thước đất phi lý bị từ chối', () => {
    const obj = JSON.parse(validLayoutJson());
    obj.input.plot.width = 0;
    const result = parseLayoutJson(JSON.stringify(obj));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('đất');
  });

  test('round-trip: xuất rồi nhập giữ nguyên số phòng từng tầng', () => {
    const layout = generateLayouts(applyPreset(presets[3]), 10, 11)[0];
    const text = JSON.stringify({schemaVersion: SCHEMA_VERSION, ...layout}, null, 2);
    const result = parseLayoutJson(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.layout.floors.map(f => f.rooms.length)).toEqual(layout.floors.map(f => f.rooms.length));
    }
  });
});

describe('sanitizeLayout (dùng cho thư viện localStorage)', () => {
  test('entry hỏng trả null thay vì throw', () => {
    expect(sanitizeLayout('rác', [])).toBeNull();
    expect(sanitizeLayout({floors: 'x'}, [])).toBeNull();
    expect(sanitizeLayout(null, [])).toBeNull();
  });
});
