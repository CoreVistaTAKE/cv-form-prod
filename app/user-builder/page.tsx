import UserBuilderClient from "./page.client";
export const dynamic = "force-dynamic";

export default function UserBuilderPage() {
  return (
    <main className="container" data-user-builder="1">
      <UserBuilderClient />
    </main>
  );
}
