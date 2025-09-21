import { AnalysisResult } from '../types';

export const calculateMean = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
};

export const calculateVariance = (numbers: number[]): number => {
  if (numbers.length < 2) return 0;
  const mean = calculateMean(numbers);
  const squareDiffs = numbers.map(val => (val - mean) ** 2);
  return calculateMean(squareDiffs);
};

export const analyzeGroupShift = (
    preDiscussionMean: number, 
    consensusThreshold: number, 
    initialThresholds: number[]
): AnalysisResult => {
    const mean = preDiscussionMean;
    const consensus = consensusThreshold;
    const scaleMidpoint = 5.5; // Midpoint of a 1-10 scale

    const meanDistanceFromMid = Math.abs(mean - scaleMidpoint);
    const consensusDistanceFromMid = Math.abs(consensus - scaleMidpoint);

    let shiftDirection: AnalysisResult['shiftDirection'] = 'no change';
    if (consensusDistanceFromMid > meanDistanceFromMid) {
        shiftDirection = 'more extreme';
    } else if (consensusDistanceFromMid < meanDistanceFromMid) {
        shiftDirection = 'less extreme';
    }

    const isPolarized = shiftDirection === 'more extreme';

    const minInitial = Math.min(...initialThresholds);
    const maxInitial = Math.max(...initialThresholds);
    let isExtremityShift = false;
    let extremityShiftInfo = '';
    if (consensus < minInitial) {
        isExtremityShift = true;
        extremityShiftInfo = `lower than any individual member's initial response of ${minInitial}`;
    } else if (consensus > maxInitial) {
        isExtremityShift = true;
        extremityShiftInfo = `higher than any individual member's initial response of ${maxInitial}`;
    }

    let shiftType: AnalysisResult['shiftType'] = 'none';
    if(consensus > mean) {
        shiftType = 'risk-seeking';
    } else if (consensus < mean) {
        shiftType = 'risk-averse';
    }

    return {
        shift: consensus - mean,
        shiftDirection,
        shiftType,
        isPolarized,
        isExtremityShift,
        extremityShiftInfo
    };
};