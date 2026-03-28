export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark" data-theme="dark">
      {children}
    </div>
  );
}
