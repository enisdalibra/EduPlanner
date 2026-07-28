import { useUiStore } from "@/store/uiStore";
import { dict } from "./dict";

/**
 * Custom hook for internationalization (i18n) with fallback support
 * Provides a translation function that looks up keys in the dictionary
 * with automatic fallback from English to Indonesian
 * 
 * @returns {{ t: (key: string, variables?: Record<string, string | number>) => string, language: 'id' | 'en' }}
 *   t: Translation function that takes a key path and optional variables for interpolation
 *   language: Current active language ('id' for Indonesian, 'en' for English)
 * 
 * @example
 * ```tsx
 * const { t } = useTranslation();
 * const greeting = t('sidebar.dashboard'); // Returns "Dashboard" or "Dashboard" based on language
 * const message = t('dashboard.studentScattered', { totalClasses: 5 }); 
 * // Returns "Students spread across 5 Classes" with variable interpolation
 * ```
 */
export function useTranslation() {
  const language = useUiStore((state) => state.language);
   
  /**
   * Translates a key path using the dictionary with fallback support
   * @param key - Dot-separated path to the translation (e.g., 'sidebar.dashboard')
   * @param variables - Optional object for variable interpolation in translations
   * @returns Translated string with variables interpolated, or the key itself if not found
   */
  const t = (key: string, variables?: Record<string, string | number>) => {
    const keys = key.split('.');
    let val: any = dict[language];
    for (const k of keys) {
      if (val && val[k] !== undefined) {
        val = val[k];
      } else {
        // Fallback to Indonesian if key not found in English
        let fallbackVal: any = dict['id'];
        for (const fbK of keys) {
          if (fallbackVal && fallbackVal[fbK] !== undefined) {
            fallbackVal = fallbackVal[fbK];
          } else {
            return key; // return key if completely missing
          }
        }
        val = fallbackVal;
        break;
      }
    }

    if (typeof val === 'string' && variables) {
      let populatedStr = val;
      for (const [vKey, vVal] of Object.entries(variables)) {
        populatedStr = populatedStr.replace(new RegExp(`{{${vKey}}}`, 'g'), String(vVal));
      }
      return populatedStr;
    }

    return typeof val === 'string' ? val : key;
  };

  return { t, language };
}
