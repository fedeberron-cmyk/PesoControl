import { describe, expect, it } from 'vitest';
import {
  CALORIES_PER_KG,
  calculateBMR,
  calculateTDEE,
  cumulativeBalance,
  debtProgress,
  defaultDebtTotalKcal,
  paceFromNets,
  projectGoalDate,
  recalibrateTDEE,
  theoreticalWeight,
} from './ledger';

describe('ledger', () => {
  describe('BMR and TDEE', () => {
    it('calculates Mifflin-St Jeor BMR and activity-adjusted TDEE', () => {
      expect(calculateBMR('male', 101, 180, 40)).toBe(1940);
      expect(calculateBMR('female', 70, 165, 35)).toBe(1395.25);
      expect(calculateTDEE(1940, 'moderate')).toBe(2556);
    });
  });

  describe('cumulativeBalance', () => {
    it('sums empty, single, and mixed-sign daily nets', () => {
      expect(cumulativeBalance([])).toBe(0);
      expect(cumulativeBalance([-500])).toBe(-500);
      expect(cumulativeBalance([-500, 200, -1000, 300])).toBe(-1000);
    });
  });

  describe('theoreticalWeight', () => {
    it('converts cumulative net calories into rounded theoretical weight', () => {
      expect(theoreticalWeight(101, -75616)).toBe(91.2);
      expect(theoreticalWeight(101, 7700)).toBe(102);
      expect(theoreticalWeight(101, 0)).toBe(101);
      expect(theoreticalWeight(101, -385)).toBe(101);
      expect(theoreticalWeight(101, -386)).toBe(100.9);
    });
  });

  describe('debtProgress', () => {
    it('uses the stored debt total (Federico: 127,500) as the anchor', () => {
      const progress = debtProgress({
        debtTotalKcal: 127500,
        cumulativeNet: -75616,
      });

      expect(progress.debtTotalKcal).toBe(127500);
      expect(progress.paidKcal).toBe(75616);
      expect(progress.paidKg).toBe(9.8);
      expect(progress.remainingKcal).toBe(51884);
      expect(progress.remainingKg).toBe(6.7);
      expect(progress.pct).toBeCloseTo(0.593, 3);
    });

    it('caps overshoot at complete progress', () => {
      const progress = debtProgress({
        debtTotalKcal: 127500,
        cumulativeNet: -200000,
      });

      expect(progress.paidKcal).toBe(127500);
      expect(progress.remainingKcal).toBe(0);
      expect(progress.pct).toBe(1);
    });

    it('floors surplus progress at zero (debt grew)', () => {
      const progress = debtProgress({
        debtTotalKcal: 127500,
        cumulativeNet: 1000,
      });

      expect(progress.paidKcal).toBe(0);
      expect(progress.paidKg).toBe(0);
      expect(progress.pct).toBe(0);
    });

    it('defaultDebtTotalKcal is only a fallback (16kg span -> 123,200)', () => {
      expect(defaultDebtTotalKcal(101, 85)).toBe(123200);
    });
  });

  describe('kg and kcal conversion', () => {
    it('uses 7700 kcal per kg in both directions', () => {
      expect(CALORIES_PER_KG).toBe(7700);
      expect(2.5 * CALORIES_PER_KG).toBe(19250);
      expect(19250 / CALORIES_PER_KG).toBe(2.5);
    });
  });

  describe('recalibrateTDEE', () => {
    it('adjusts current TDEE from theoretical vs actual change', () => {
      expect(recalibrateTDEE(2500, -1.5, -1, 14)).toBe(2225);
    });

    it('guards non-positive day counts', () => {
      expect(recalibrateTDEE(2500, -1.5, -1, 0)).toBe(2500);
      expect(recalibrateTDEE(2500, -1.5, -1, -3)).toBe(2500);
    });

    it('leaves TDEE unchanged when the difference is zero', () => {
      expect(recalibrateTDEE(2500, -1, -1, 14)).toBe(2500);
    });
  });

  describe('paceFromNets', () => {
    it('returns the average daily net', () => {
      expect(paceFromNets([])).toBe(0);
      expect(paceFromNets([-500, -700, 300])).toBeCloseTo(-300);
    });
  });

  describe('projectGoalDate', () => {
    it('projects a finite goal date from a deficit pace', () => {
      expect(
        projectGoalDate({
          remainingKcal: 47584,
          paceKcalPerDay: -500,
          fromDateISO: '2026-05-28',
        })
      ).toEqual({
        reachable: true,
        days: 96,
        dateISO: '2026-09-01',
      });
    });

    it('marks zero or surplus pace as unreachable without NaN', () => {
      expect(
        projectGoalDate({
          remainingKcal: 47584,
          paceKcalPerDay: 0,
          fromDateISO: '2026-05-28',
        })
      ).toEqual({ reachable: false });

      expect(
        projectGoalDate({
          remainingKcal: 47584,
          paceKcalPerDay: 200,
          fromDateISO: '2026-05-28',
        })
      ).toEqual({ reachable: false });
    });
  });
});
