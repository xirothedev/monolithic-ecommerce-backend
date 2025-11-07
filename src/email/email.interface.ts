export interface VerifyEmailProps {
  email: string;
  code: string;
  url: string;
}

export interface MfaCodeProps {
  email: string;
  code: string;
}
