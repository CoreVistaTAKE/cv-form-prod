'use client';
import React from 'react';
import UserBuilderPanels from './panels/UserBuilderPanels';

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

export default function UserBuilderClient(props: Props) {
  // 余計な処理はここでしない。すべて UserBuilderPanels に委譲する
  return <UserBuilderPanels {...props} />;
}
