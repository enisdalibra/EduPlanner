import { useState, useEffect } from "react";
import type React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { saveProfile } from "./api";
import { INPUT_LIMITS } from "@/lib/validation";

export function ProfileView() {
  const profileData = useLiveQuery(() => db.profile.get("default"));
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (profileData) {
      setName(profileData.name || "");
      setSchool(profileData.school || "");
      setRole(profileData.role || "");
      setEmail(profileData.email || "");
      setAvatar(profileData.avatar || "");
    }
  }, [profileData]);

  const handleSaveProfile = async () => {
    // Basic validation
    if (!name.trim()) {
      toast.error(t('profilePage.errorEmptyName'));
      return;
    }
    try {
      await saveProfile({ name, school, role, email, avatar });
      toast.success(t('profilePage.saveSuccess'));
    } catch (err) {
      toast.error(t('profilePage.saveError'));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto view-enter pb-10">
      <div>
        <h1 className="page-title">{t('profilePage.title')}</h1>
        <p className="page-description">{t('profilePage.desc')}</p>
      </div>

      <Card className="border-gray-100 dark:border-gray-700">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 pb-6">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon name="person" className="w-6 h-6 text-primary" />
            </div>
            {t('profilePage.detailTitle')}
          </CardTitle>
          <CardDescription>{t('profilePage.detailDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('profilePage.fullName')}</Label>
              <Input 
                id="name" 
              placeholder={t('profilePage.fullNamePlaceholder')}
              maxLength={INPUT_LIMITS.personName}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('profilePage.email')}</Label>
              <Input 
                id="email" 
              placeholder={t('profilePage.emailPlaceholder') || "Email address"}
              maxLength={INPUT_LIMITS.email}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="school" className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('profilePage.school')}</Label>
            <Input 
              id="school" 
              placeholder={t('profilePage.schoolPlaceholder')}
              maxLength={INPUT_LIMITS.title}
              value={school}
              onChange={e => setSchool(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('profilePage.role')}</Label>
            <Input 
              id="role" 
              placeholder={t('profilePage.rolePlaceholder')}
              maxLength={INPUT_LIMITS.shortText}
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avatar" className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('profilePage.avatar') || "Avatar URL"}</Label>
            <Input 
              id="avatar" 
              placeholder={t('profilePage.avatarPlaceholder') || "Avatar image URL"}
              maxLength={INPUT_LIMITS.url}
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-100 dark:border-gray-700 p-6 bg-gray-50/50 dark:bg-gray-800/50">
           <Button onClick={handleSaveProfile} size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
             <Icon name="save" className="w-5 h-5 mr-2" />
             {t('common.save')}
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
