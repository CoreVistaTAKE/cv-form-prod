// app/user-builder/page.tsx
import UserBuilderClient from './page.client';
export const dynamic = 'force-dynamic';

export default function UserBuilderPage() {
  return (
    <main className="container" data-user-builder="1">
      <UserBuilderClient
        createUrl={process.env.FLOW_CREATE_FORM_FOLDER_URL!}
        statusUrl={process.env.FLOW_GET_BUILD_STATUS_URL!}
        defaultUser={process.env.NEXT_PUBLIC_DEFAULT_USER}
        defaultHost={process.env.NEXT_PUBLIC_DEFAULT_HOST}
      />
    </main>
  );
}
