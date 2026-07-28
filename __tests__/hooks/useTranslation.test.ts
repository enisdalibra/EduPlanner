import { renderHook, act } from '@testing-library/react';
import { useTranslation } from '../../src/hooks/useTranslation';
import { useUiStore } from '../../src/store/uiStore';

describe('useTranslation hook', () => {
  beforeEach(() => {
    act(() => {
      useUiStore.getState().setLanguage('id');
    });
  });

  it('should return Indonesian as default language', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('id');
  });

  it('should translate simple keys', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('sidebar.dashboard')).toBe('Dashboard');
  });

  it('should fallback to the key when translation is missing', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('should interpolate variables in translations', () => {
    const { result } = renderHook(() => useTranslation());
    const translated = result.current.t('dashboard.studentScattered', { totalClasses: 5 });
    expect(translated).toBe('Siswa tersebar di 5 Kelas');
  });

  it('should translate English keys when language is changed', () => {
    act(() => {
      useUiStore.getState().setLanguage('en');
    });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('en');
    expect(result.current.t('dashboard.studentScattered', { totalClasses: 5 })).toBe('Students spread across 5 Classes');
  });

  it('should update language when changed via uiStore', () => {
    const { result } = renderHook(() => useTranslation());
    act(() => {
      useUiStore.getState().setLanguage('en');
    });
    expect(result.current.language).toBe('en');
  });
});
