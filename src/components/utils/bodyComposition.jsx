// Body Composition Analysis Formulas

/**
 * Calculate BMI (Body Mass Index)
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {number} BMI value
 */
export function calculateBMI(weight, height) {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Harris-Benedict Formula
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} BMR value
 */
export function calculateBMR(weight, height, age, gender) {
  if (!weight || !height || !age || !gender) return null;
  
  if (gender === 'male') {
    return (88.4 + (13.4 * weight) + (4.8 * height) - (5.68 * age));
  } else {
    return (447.6 + (9.25 * weight) + (3.10 * height) - (4.33 * age));
  }
}

/**
 * Calculate IBW (Ideal Body Weight)
 * @param {number} height - Height in cm
 * @param {string} gender - 'male' or 'female'
 * @returns {number} IBW in kg
 */
export function calculateIBW(height, gender) {
  if (!height || !gender) return null;
  
  if (gender === 'male') {
    return height - 100;
  } else {
    return height - 105;
  }
}

/**
 * Calculate WHR (Waist Hip Ratio)
 * @param {number} waist - Waist circumference in cm
 * @param {number} hip - Hip circumference in cm
 * @returns {number} WHR value
 */
export function calculateWHR(waist, hip) {
  if (!waist || !hip) return null;
  return waist / hip;
}

/**
 * Calculate Body Fat Percentage (BFP)
 * @param {number} bmi - BMI value
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @param {boolean} isChild - Whether the person is a child (under 18)
 * @returns {number} BFP percentage
 */
export function calculateBFP(bmi, age, gender, isChild = false) {
  if (!bmi || age === null || age === undefined || !gender) return null;
  
  if (isChild) {
    // For children (boys and girls)
    if (gender === 'male') {
      return (1.51 * bmi) - (0.70 * age) - 2.2;
    } else {
      return (1.51 * bmi) - (0.70 * age) + 1.4;
    }
  } else {
    // For adults
    if (gender === 'male') {
      return (1.20 * bmi) + (0.23 * age) - 16.2;
    } else {
      return (1.20 * bmi) + (0.23 * age) - 5.4;
    }
  }
}

/**
 * Calculate LBM (Lean Body Mass)
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {string} gender - 'male' or 'female'
 * @returns {number} LBM in kg
 */
export function calculateLBM(weight, height, gender) {
  if (!weight || !height || !gender) return null;
  
  if (gender === 'male') {
    return (0.407 * weight) + (0.267 * height) - 19.2;
  } else {
    return (0.252 * weight) + (0.473 * height) - 48.3;
  }
}

/**
 * Calculate Fat Mass (FM)
 * @param {number} bfp - Body Fat Percentage
 * @param {number} weight - Weight in kg
 * @returns {number} Fat mass in kg
 */
export function calculateFatMass(bfp, weight) {
  if (!bfp || !weight) return null;
  return (bfp / 100) * weight;
}

/**
 * Calculate Lean Mass (LM)
 * @param {number} weight - Weight in kg
 * @param {number} fatMass - Fat mass in kg
 * @returns {number} Lean mass in kg
 */
export function calculateLeanMass(weight, fatMass) {
  if (!weight || fatMass === null || fatMass === undefined) return null;
  return weight - fatMass;
}

/**
 * Calculate Visceral Fat
 * @param {number} totalBodyFat - Total body fat in kg
 * @returns {number} Visceral fat in kg (10% of total body fat)
 */
export function calculateVisceralFat(totalBodyFat) {
  if (!totalBodyFat) return null;
  return totalBodyFat * 0.10;
}

/**
 * Calculate all body composition metrics
 * @param {Object} params - Parameters object
 * @param {number} params.weight - Weight in kg
 * @param {number} params.height - Height in cm
 * @param {number} params.age - Age in years
 * @param {string} params.gender - 'male' or 'female'
 * @param {number} params.waist - Waist circumference in cm (optional)
 * @param {number} params.hip - Hip circumference in cm (optional)
 * @returns {Object} All body composition metrics
 */
export function calculateAllMetrics({ weight, height, age, gender, waist, hip }) {
  const isChild = age < 18;
  const bmi = calculateBMI(weight, height);
  const bmr = calculateBMR(weight, height, age, gender);
  const ibw = calculateIBW(height, gender);
  const whr = waist && hip ? calculateWHR(waist, hip) : null;
  const bfp = bmi ? calculateBFP(bmi, age, gender, isChild) : null;
  const lbm = calculateLBM(weight, height, gender);
  const fatMass = bfp ? calculateFatMass(bfp, weight) : null;
  const leanMass = fatMass !== null ? calculateLeanMass(weight, fatMass) : null;
  const visceralFat = fatMass ? calculateVisceralFat(fatMass) : null;

  return {
    bmi: bmi ? parseFloat(bmi.toFixed(1)) : null,
    bmr: bmr ? parseFloat(bmr.toFixed(0)) : null,
    ibw: ibw ? parseFloat(ibw.toFixed(1)) : null,
    whr: whr ? parseFloat(whr.toFixed(2)) : null,
    bfp: bfp ? parseFloat(bfp.toFixed(1)) : null,
    lbm: lbm ? parseFloat(lbm.toFixed(1)) : null,
    fatMass: fatMass ? parseFloat(fatMass.toFixed(1)) : null,
    leanMass: leanMass ? parseFloat(leanMass.toFixed(1)) : null,
    visceralFat: visceralFat ? parseFloat(visceralFat.toFixed(2)) : null
  };
}

/**
 * Get BMI category
 * @param {number} bmi - BMI value
 * @returns {string} BMI category
 */
export function getBMICategory(bmi) {
  if (!bmi) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * Get WHR category
 * @param {number} whr - WHR value
 * @param {string} gender - 'male' or 'female'
 * @returns {string} WHR risk category
 */
export function getWHRCategory(whr, gender) {
  if (!whr || !gender) return 'Unknown';
  
  if (gender === 'male') {
    if (whr < 0.95) return 'Low Risk';
    if (whr < 1.0) return 'Moderate Risk';
    return 'High Risk';
  } else {
    if (whr < 0.80) return 'Low Risk';
    if (whr < 0.85) return 'Moderate Risk';
    return 'High Risk';
  }
}

/**
 * Get Body Fat Percentage category
 * @param {number} bfp - Body Fat Percentage
 * @param {string} gender - 'male' or 'female'
 * @returns {string} BFP category
 */
export function getBFPCategory(bfp, gender) {
  if (!bfp || !gender) return 'Unknown';
  
  if (gender === 'male') {
    if (bfp < 6) return 'Essential Fat';
    if (bfp < 14) return 'Athletes';
    if (bfp < 18) return 'Fitness';
    if (bfp < 25) return 'Average';
    return 'Obese';
  } else {
    if (bfp < 14) return 'Essential Fat';
    if (bfp < 21) return 'Athletes';
    if (bfp < 25) return 'Fitness';
    if (bfp < 32) return 'Average';
    return 'Obese';
  }
}