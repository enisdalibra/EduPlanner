import React from "react";
;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";

export function AboutView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Icon name="info" className="w-6 h-6 text-blue-500" />
          {t('about.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('about.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon name="keyboard" className="w-5 h-5 text-slate-500" />
                {t('about.keyboardAccess')}
              </CardTitle>
              <CardDescription>
                {t('about.keyboardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="table-header border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">{t('about.action')}</th>
                      <th className="px-4 py-3">{t('about.key')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SHORTCUTS.map((sc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-700">{t(`shortcuts.${sc.tKey}`)}</td>
                        <td className="px-4 py-3">
                          <kbd className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200 font-mono text-xs shadow-sm font-semibold whitespace-nowrap">
                            {sc.key}
                          </kbd>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('about.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                {t('about.desc')}
              </p>
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                <p className="font-semibold mb-1">{t('about.devInfo')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    E
                  </div>
                  <div className="flex flex-col text-xs">
                    <span className="font-bold text-slate-900 text-sm">Enisda Libra</span>
                    <a 
                      href="https://github.com/enisdalibra" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Icon name="code" className="w-3 h-3" /> @enisdalibra
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
