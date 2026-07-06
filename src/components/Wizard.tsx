import {useState} from 'react';
import type {DesignInput} from '../types';
import {applyPreset, presets, vietnamAreaConfig} from '../engine/defaults';

interface Props {
  input: DesignInput;
  setInput: (i: DesignInput) => void;
  onGenerate: () => void;
}

const STEPS = ['Đất & nhà', 'Nhu cầu phòng', 'Tùy chọn & sinh phương án'];

export function Wizard({input, setInput, onGenerate}: Props) {
  const [step, setStep] = useState(0);

  const set = (path: string, val: unknown) => {
    const next = structuredClone(input) as unknown as Record<string, Record<string, unknown>>;
    const [a, b] = path.split('.');
    next[a][b] = val;
    setInput(next as unknown as DesignInput);
  };
  const num = (path: string) => (v: string) => {
    const n = Number(v);
    if (Number.isFinite(n)) set(path, n);
  };
  const checked = (path: string) => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], input) as boolean;

  return (
    <section className="panel wizard">
      <h2>Nhập yêu cầu thiết kế</h2>
      <div className="stepDots" role="tablist" aria-label="Các bước nhập liệu">
        {STEPS.map((s, i) => (
          <button key={s} role="tab" aria-selected={i === step} className={i === step ? 'active' : ''} onClick={() => setStep(i)}>
            <b>{i + 1}</b> {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="step">
          <div className="presets">
            {presets.map(p => (
              <button key={p.name} onClick={() => setInput(applyPreset(p))}>{p.name}</button>
            ))}
          </div>
          <div className="grid2">
            <label>Loại nhà
              <select value={input.plot.houseType} onChange={e => set('plot.houseType', e.target.value)}>
                <option value="nha-ong">Nhà ống</option>
                <option value="nha-pho">Nhà phố</option>
                <option value="biet-thu-mini">Biệt thự mini</option>
                <option value="can-ho">Căn hộ</option>
                <option value="nha-cap-4">Nhà cấp 4</option>
              </select>
            </label>
            <label>Ngang (m)<input type="number" step="0.1" value={input.plot.width} onChange={e => num('plot.width')(e.target.value)} /></label>
            <label>Sâu (m)<input type="number" step="0.1" value={input.plot.depth} onChange={e => num('plot.depth')(e.target.value)} /></label>
            <label>Số tầng<input type="number" min="1" max="6" value={input.plot.floors} onChange={e => num('plot.floors')(e.target.value)} /></label>
            <label>Hướng mặt tiền<input value={input.plot.frontDirection} onChange={e => set('plot.frontDirection', e.target.value)} /></label>
            <label>Để xe
              <select value={input.plot.parking} onChange={e => set('plot.parking', e.target.value)}>
                <option value="none">Không</option>
                <option value="motorbike">Xe máy</option>
                <option value="car">Ô tô</option>
              </select>
            </label>
            <label>Kiểu đỗ ô tô
              <select value={input.plot.parkingMode} onChange={e => set('plot.parkingMode', e.target.value)}>
                <option value="auto">Tự động</option>
                <option value="longitudinal">Đỗ dọc</option>
                <option value="transverse">Đỗ ngang (cần ngang ≥5.5m)</option>
              </select>
            </label>
            <label>Cầu thang
              <select value={input.plot.stair} onChange={e => set('plot.stair', e.target.value)}>
                <option value="auto">Tự động</option>
                <option value="middle">Giữa nhà</option>
                <option value="back">Cuối nhà</option>
                <option value="side">Cạnh nhà</option>
              </select>
            </label>
          </div>
          <div className="checks">
            {([['plot.frontYard', 'Sân trước'], ['plot.backYard', 'Sân sau'], ['plot.void', 'Giếng trời']] as const).map(([p, t]) => (
              <label key={p}><input type="checkbox" checked={checked(p)} onChange={e => set(p, e.target.checked)} />{t}</label>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="step">
          <div className="grid2">
            <label>Phòng ngủ<input type="number" min="0" max="10" value={input.requirements.bedrooms} onChange={e => num('requirements.bedrooms')(e.target.value)} /></label>
            <label>Số WC<input type="number" min="0" max="10" value={input.requirements.wcs} onChange={e => num('requirements.wcs')(e.target.value)} /></label>
          </div>
          <div className="checks">
            {([
              ['requirements.living', 'Phòng khách'],
              ['requirements.kitchen', 'Bếp + ăn'],
              ['requirements.worship', 'Phòng thờ'],
              ['requirements.laundry', 'Giặt/phơi'],
              ['requirements.storage', 'Kho'],
              ['requirements.balcony', 'Ban công/logia'],
              ['requirements.masterSuite', 'Master có WC riêng'],
              ['requirements.privateWorshipAccess', 'Phòng thờ cần lối riêng']
            ] as const).map(([p, t]) => (
              <label key={p}><input type="checkbox" checked={checked(p)} onChange={e => set(p, e.target.checked)} />{t}</label>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step">
          <label className="checks" style={{display: 'block'}}>
            <input type="checkbox" checked={input.allowWcNearLiving} onChange={e => setInput({...input, allowWcNearLiving: e.target.checked})} />
            Chấp nhận WC gần phòng khách
          </label>
          <textarea
            placeholder="Ghi chú tự do bằng tiếng Việt"
            value={input.requirements.notes}
            onChange={e => set('requirements.notes', e.target.value)}
          />
          <button onClick={() => setInput({...input, areas: vietnamAreaConfig})}>Dùng cấu hình diện tích phổ biến cho nhà Việt Nam</button>
          <button className="primary" onClick={onGenerate}>Sinh 10+ phương án</button>
        </div>
      )}

      <div className="wizardNav">
        <button disabled={step === 0} onClick={() => setStep(step - 1)}>← Quay lại</button>
        {step < STEPS.length - 1
          ? <button className="primary" onClick={() => setStep(step + 1)}>Tiếp tục →</button>
          : <span />}
      </div>
    </section>
  );
}
