import { supabase } from '../lib/supabaseClient';

/**
 * Country detection service using IP geolocation
 * Uses ipapi.co free API for country detection
 */

const COUNTRY_FLAG_EMOJIS = {
  AF: '🇦🇫', AX: '🇦🇽', AL: '🇦🇱', DZ: '🇩🇿', AS: '🇦🇸', AD: '🇦🇩', AO: '🇦🇴', AI: '🇦🇮',
  AQ: '🇦🇶', AG: '🇦🇬', AR: '🇦🇷', AM: '🇦🇲', AW: '🇦🇼', AU: '🇦🇺', AT: '🇦🇹', AZ: '🇦🇿',
  BS: '🇧🇸', BH: '🇧🇭', BD: '🇧🇩', BB: '🇧🇧', BY: '🇧🇾', BE: '🇧🇪', BZ: '🇧🇿', BJ: '🇧🇯',
  BM: '🇧🇲', BT: '🇧🇹', BO: '🇧🇴', BQ: '🇧🇶', BA: '🇧🇦', BW: '🇧🇼', BV: '🇧🇻', BR: '🇧🇷',
  IO: '🇮🇴', BN: '🇧🇳', BG: '🇧🇬', BF: '🇧🇫', BI: '🇧🇮', CV: '🇨🇻', KH: '🇰🇭', CM: '🇨🇲',
  CA: '🇨🇦', KY: '🇰🇾', CF: '🇨🇫', TD: '🇹🇩', CL: '🇨🇱', CN: '🇨🇳', CX: '🇨🇽', CC: '🇨🇨',
  CO: '🇨🇴', KM: '🇰🇲', CG: '🇨🇬', CD: '🇨🇩', CK: '🇨🇰', CR: '🇨🇷', CI: '🇨🇮', HR: '🇭🇷',
  CU: '🇨🇺', CW: '🇨🇼', CY: '🇨🇾', CZ: '🇨🇿', DK: '🇩🇰', DJ: '🇩🇯', DM: '🇩🇲', DO: '🇩🇴',
  EC: '🇪🇨', EG: '🇪🇬', SV: '🇸🇻', GQ: '🇬🇶', ER: '🇪🇷', EE: '🇪🇪', SZ: '🇸🇿', ET: '🇪🇹',
  FK: '🇫🇰', FO: '🇫🇴', FJ: '🇫🇯', FI: '🇫🇮', FR: '🇫🇷', GF: '🇬🇫', PF: '🇵🇫', TF: '🇹🇫',
  GA: '🇬🇦', GM: '🇬🇲', GE: '🇬🇪', DE: '🇩🇪', GH: '🇬🇭', GI: '🇬🇮', GR: '🇬🇷', GL: '🇬🇱',
  GD: '🇬🇩', GP: '🇬🇵', GU: '🇬🇺', GT: '🇬🇹', GG: '🇬🇬', GN: '🇬🇳', GW: '🇬🇼', GY: '🇬🇾',
  HT: '🇭🇹', HM: '🇭🇲', VA: '🇻🇦', HN: '🇭🇳', HK: '🇭🇰', HU: '🇭🇺', IS: '🇮🇸', IN: '🇮🇳',
  ID: '🇮🇩', IR: '🇮🇷', IQ: '🇮🇶', IE: '🇮🇪', IM: '🇮🇲', IL: '🇮🇱', IT: '🇮🇹', JM: '🇯🇲',
  JP: '🇯🇵', JE: '🇯🇪', JO: '🇯🇴', KZ: '🇰🇿', KE: '🇰🇪', KI: '🇰🇮', KP: '🇰🇵', KR: '🇰🇷',
  KW: '🇰🇼', KG: '🇰🇬', LA: '🇱🇦', LV: '🇱🇻', LB: '🇱🇧', LS: '🇱🇸', LR: '🇱🇷', LY: '🇱🇾',
  LI: '🇱🇮', LT: '🇱🇹', LU: '🇱🇺', MO: '🇲🇴', MG: '🇲🇬', MW: '🇲🇼', MY: '🇲🇾', MV: '🇲🇻',
  ML: '🇲🇱', MT: '🇲🇹', MH: '🇲🇭', MQ: '🇲🇶', MR: '🇲🇷', MU: '🇲🇺', YT: '🇾🇹', MX: '🇲🇽',
  FM: '🇫🇲', MD: '🇲🇩', MC: '🇲🇨', MN: '🇲🇳', ME: '🇲🇪', MS: '🇲🇸', MA: '🇲🇦', MZ: '🇲🇿',
  MM: '🇲🇲', NA: '🇳🇦', NR: '🇳🇷', NP: '🇳🇵', NL: '🇳🇱', NC: '🇳🇨', NZ: '🇳🇿', NI: '🇳🇮',
  NE: '🇳🇪', NG: '🇳🇬', NU: '🇳🇺', NF: '🇳🇫', MP: '🇲🇵', NO: '🇳🇴', OM: '🇴🇲', PK: '🇵🇰',
  PW: '🇵🇼', PS: '🇵🇸', PA: '🇵🇦', PG: '🇵🇬', PY: '🇵🇾', PE: '🇵🇪', PH: '🇵🇭', PN: '🇵🇳',
  PL: '🇵🇱', PT: '🇵🇹', PR: '🇵🇷', QA: '🇶🇦', RE: '🇷🇪', RO: '🇷🇴', RU: '🇷🇺', RW: '🇷🇼',
  BL: '🇧🇱', SH: '🇸🇭', KN: '🇰🇳', LC: '🇱🇨', MF: '🇲🇫', PM: '🇵🇲', VC: '🇻🇨', WS: '🇼🇸',
  SM: '🇸🇲', ST: '🇸🇹', SA: '🇸🇦', SN: '🇸🇳', RS: '🇷🇸', SC: '🇸🇨', SL: '🇸🇱', SG: '🇸🇬',
  SX: '🇸🇽', SK: '🇸🇰', SI: '🇸🇮', SB: '🇸🇧', SO: '🇸🇴', ZA: '🇿🇦', GS: '🇬🇸', SS: '🇸🇸',
  ES: '🇪🇸', LK: '🇱🇰', SD: '🇸🇩', SR: '🇸🇷', SJ: '🇸🇯', SE: '🇸🇪', CH: '🇨🇭', SY: '🇸🇾',
  TW: '🇹🇼', TJ: '🇹🇯', TZ: '🇹🇿', TH: '🇹🇭', TL: '🇹🇱', TG: '🇹🇬', TK: '🇹🇰', TO: '🇹🇴',
  TT: '🇹🇹', TN: '🇹🇳', TR: '🇹🇷', TM: '🇹🇲', TC: '🇹🇨', TV: '🇹🇻', UG: '🇺🇬', UA: '🇺🇦',
  AE: '🇦🇪', GB: '🇬🇧', US: '🇺🇸', UM: '🇺🇲', UY: '🇺🇾', UZ: '🇺🇿', VU: '🇻🇺', VE: '🇻🇪',
  VN: '🇻🇳', VG: '🇻🇬', VI: '🇻🇮', WF: '🇼🇫', EH: '🇪🇭', YE: '🇾🇪', ZM: '🇿🇲', ZW: '🇿🇼',
};

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode) {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  return COUNTRY_FLAG_EMOJIS[code] || null;
}

/**
 * Detect user's country from IP address using ipapi.co
 * Returns: { countryCode, countryName } or null
 */
export async function detectCountryFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('Failed to fetch country data');
    }
    const data = await response.json();
    
    return {
      countryCode: data.country_code || data.country || null,
      countryName: data.country_name || data.country || null,
    };
  } catch (error) {
    console.error('Error detecting country:', error);
    return null;
  }
}

/**
 * Update user's country in the database
 */
export async function updateUserCountry(userId) {
  try {
    const countryData = await detectCountryFromIP();
    if (!countryData || !countryData.countryCode) {
      return null;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        country_code: countryData.countryCode,
        country_name: countryData.countryName,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating country:', error);
      return null;
    }

    return countryData;
  } catch (error) {
    console.error('Error updating user country:', error);
    return null;
  }
}

/**
 * Get user's country from database or detect if not set
 */
export async function getUserCountry(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('country_code, country_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching country:', error);
      return null;
    }

    // If country not set, try to detect it
    if (!data?.country_code) {
      const detected = await updateUserCountry(userId);
      return detected;
    }

    return {
      countryCode: data.country_code,
      countryName: data.country_name,
    };
  } catch (error) {
    console.error('Error getting user country:', error);
    return null;
  }
}
