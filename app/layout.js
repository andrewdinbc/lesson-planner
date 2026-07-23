import DevModePanel from "../developer-mode/DevModePanel";
import Header from "../components/Header";
import GlobalResourceWidget from "../components/GlobalResourceWidget";
import MorpheusChat from "../components/MorpheusChat";

export const metadata = { title:"lesson-planner", description:"AI-powered lesson, unit, and year planning tool for BC, Alberta, and Ontario teachers." };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <GlobalResourceWidget />
        <footer style={{ padding: "20px 24px", borderTop: "1px solid #e3ddd0", fontSize: 12, color: "#6b6459", textAlign: "center", background: "#f7f5f0" }}>
          <a href="https://morpheus-scheduler.vercel.app/data-residency" target="_blank" rel="noopener noreferrer" style={{ color: "#1c3557", textDecoration: "underline" }}>
            Data Residency &amp; Privacy Disclosure
          </a>
        </footer>
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
              <MorpheusChat productName="Lesson Planner" />
      </body>
    </html>
  );
}
