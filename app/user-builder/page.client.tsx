'use client';
import UserBuilderPanels from './panels/UserBuilderPanels';

type Props = {
  createUrl: string;
  statusUrl: string;
  lookupUrl: string;             // ← 追加
  defaultUser?: string | null;
  defaultHost?: string | null;
};
export default function UserBuilderClient(props: Props) {
  return <UserBuilderPanels {...props} />;
}
