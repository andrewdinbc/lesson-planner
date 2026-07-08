import DevModePanel from "../developer-mode/DevModePanel";

export const metadata = { title:"lesson-planner", description:"AI-powered lesson, unit, and year planning tool for BC, Alberta, and Ontario teachers." };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <DevModePanel
          productName="Lesson Planner (Curriculum Designer)"
          sourceRepo="andrewdinbc/lesson-planner"
          userEmail="andrewsinbc3@gmail.com"
          userKey="owner"
          morpheusUrl="https://morpheus-scheduler.vercel.app"
          enabled={true}
          audienceLabel="a K-12 teacher planning curriculum"
          mode="personal"
        />
      </body>
    </html>
  );
}
