'use client';

import { Button } from '@inquiry/client-ui';
import type { FilterConnector } from '@inquiry/shared-segment';

interface ConnectorToggleProps {
  connector: FilterConnector;
  onToggle: () => void;
}

/**
 * AND/OR 연결자 토글 버튼.
 * 클릭 시 AND ↔ OR을 전환한다.
 */
export function ConnectorToggle({ connector, onToggle }: ConnectorToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="h-6 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
    >
      {connector.toUpperCase()}
    </Button>
  );
}
