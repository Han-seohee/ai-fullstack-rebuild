export const siteConfig = {
  name: "AI Dev Assistant",
  title: "AI Dev Assistant",
  description:
    "오늘 작업한 내용을 입력하면 AI가 커밋 메시지와 개발일지를 생성합니다.",
  /** 배포 URL (미설정 시 localhost). Vercel 등에서는 NEXT_PUBLIC_SITE_URL 사용 */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
  ogImage: "/og.jpg",
  locale: "ko_KR",
} as const;

export type SiteConfig = typeof siteConfig;
