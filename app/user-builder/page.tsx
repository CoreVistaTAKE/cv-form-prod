import UserBuilderClient from './page.client';

export const dynamic = 'force-dynamic';

export default function UserBuilderPage() {
  const userBuilderAttr = { ['user-builder']: '' };

  const createUrl = process.env.FLOW_CREATE_FORM_FOLDER_URL!;
  const statusUrl = process.env.FLOW_GET_BUILD_STATUS_URL!;
  const defaultUser = process.env.NEXT_PUBLIC_DEFAULT_USER;
  const defaultHost = process.env.NEXT_PUBLIC_DEFAULT_HOST;

  return (
    <main className="container" data-user-builder="1" {...userBuilderAttr}>
      <UserBuilderClient
        createUrl={createUrl}
        statusUrl={statusUrl}
        defaultUser={defaultUser}
        defaultHost={defaultHost}
      />
    </main>
  );
}
