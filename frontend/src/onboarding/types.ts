export interface TeamConfig {
  displayName: string;
  slug: string;
  groupJid: string | null;
  groupSubject: string | null;
  onboarded: boolean;
}

export interface WhatsAppGroup {
  id: string;
  subject: string;
}
