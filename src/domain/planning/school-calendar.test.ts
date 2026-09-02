import { describe, expect, it } from 'vitest';
import { schoolCalendarV1 } from '@/config/school-calendar';
import { resolveCapacityRange, resolveDailyCapacity, type CalendarEvent } from './school-calendar';

const base = { weekdayCapacityMinutes: 120, weekendCapacityMinutes: 240 };

const event = (over: Partial<CalendarEvent> & Pick<CalendarEvent, 'type'>): CalendarEvent => ({
  id: over.type,
  startDate: '2026-11-10',
  endDate: '2026-11-10',
  capacityOverride: null,
  ...over,
});

const resolve = (date: string, events: CalendarEvent[] = []) =>
  resolveDailyCapacity({ date, ...base, events }, schoolCalendarV1);

describe('resolveDailyCapacity', () => {
  it('uses weekday capacity on a normal weekday', () => {
    expect(resolve('2026-11-10')).toMatchObject({ minutes: 120, basis: 'WEEKDAY' });
  });

  it('uses weekend capacity on Saturday and Sunday', () => {
    expect(resolve('2026-11-14').basis).toBe('WEEKEND'); // Saturday
    expect(resolve('2026-11-15')).toMatchObject({ minutes: 240, basis: 'WEEKEND' });
  });

  it('treats an explicit NORMAL_SCHOOL_DAY on a weekend as a working day', () => {
    const working = resolve('2026-11-14', [
      event({ type: 'NORMAL_SCHOOL_DAY', startDate: '2026-11-14', endDate: '2026-11-14' }),
    ]);
    expect(working).toMatchObject({ minutes: 120, basis: 'NORMAL_SCHOOL_DAY' });
  });

  it('gives holidays and vacations weekend-equivalent capacity', () => {
    expect(resolve('2026-11-10', [event({ type: 'HOLIDAY' })]).minutes).toBe(240);
    expect(
      resolve('2026-11-10', [
        event({ type: 'VACATION', startDate: '2026-11-01', endDate: '2026-11-30' }),
      ]).minutes,
    ).toBe(240);
  });

  it('reduces capacity on exam and practical days, and zeroes unavailable days', () => {
    expect(resolve('2026-11-10', [event({ type: 'EXAM_DAY' })]).minutes).toBe(45);
    expect(resolve('2026-11-10', [event({ type: 'PRACTICAL_DAY' })]).minutes).toBe(60);
    expect(resolve('2026-11-10', [event({ type: 'UNAVAILABLE' })])).toMatchObject({
      minutes: 0,
      basis: 'UNAVAILABLE',
    });
  });

  it('honours an explicit capacity override', () => {
    expect(
      resolve('2026-11-10', [event({ type: 'STUDY_LEAVE', capacityOverride: 300 })]).minutes,
    ).toBe(300);
    expect(resolve('2026-11-10', [event({ type: 'HOLIDAY', capacityOverride: 0 })]).minutes).toBe(
      0,
    );
  });

  it('resolves overlapping events by priority — most restrictive study conflict wins', () => {
    expect(
      resolve('2026-11-10', [event({ type: 'HOLIDAY' }), event({ type: 'UNAVAILABLE' })]).minutes,
    ).toBe(0);
    expect(
      resolve('2026-11-10', [event({ type: 'STUDY_LEAVE' }), event({ type: 'EXAM_DAY' })]),
    ).toMatchObject({ minutes: 45, basis: 'EXAM_DAY' });
  });

  it('breaks a same-type tie deterministically, preferring an explicit override', () => {
    const a = event({ type: 'HOLIDAY', id: 'a', capacityOverride: null });
    const b = event({ type: 'HOLIDAY', id: 'b', capacityOverride: 30 });
    expect(resolve('2026-11-10', [a, b]).appliedEventId).toBe('b');
    expect(resolve('2026-11-10', [b, a]).appliedEventId).toBe('b');
  });
});

describe('resolveCapacityRange', () => {
  it('resolves every day in the window and is deterministic', () => {
    const days = resolveCapacityRange(
      {
        from: '2026-12-24',
        to: '2026-12-27',
        ...base,
        events: [
          event({ type: 'VACATION', startDate: '2026-12-24', endDate: '2026-12-27' }),
          event({ type: 'UNAVAILABLE', startDate: '2026-12-25', endDate: '2026-12-25' }),
        ],
      },
      schoolCalendarV1,
    );

    expect(days.map((d) => d.minutes)).toEqual([240, 0, 240, 240]);
    expect(days.map((d) => d.date)).toEqual([
      '2026-12-24',
      '2026-12-25',
      '2026-12-26',
      '2026-12-27',
    ]);
  });
});
