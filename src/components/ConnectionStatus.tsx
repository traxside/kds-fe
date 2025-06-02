import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LuWifi,
  LuWifiOff,
  LuTriangleAlert,
  LuRefreshCw,
  LuCircleCheck,
} from "react-icons/lu";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

interface ConnectionStatusCompactProps {
  isConnected: boolean;
  error?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  error,
  onRetry,
  isRetrying = false,
  className,
}) => {
  return (
    <div
      className={cn("flex flex-col space-y-2 p-4 border rounded-lg", className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <LuCircleCheck className="h-5 w-5 text-green-500" />
              <span className="text-green-700 dark:text-green-400 font-medium">
                Connected
              </span>
            </>
          ) : (
            <>
              <LuWifiOff className="h-5 w-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400 font-medium">
                Disconnected
              </span>
            </>
          )}
        </div>

        <Badge
          variant={isConnected ? "outline" : "destructive"}
          className="text-xs"
        >
          {isConnected ? "Online" : "Offline"}
        </Badge>
      </div>

      {error && (
        <div className="flex items-start space-x-2 p-2 bg-red-50 dark:bg-red-950 rounded border-l-4 border-red-500">
          <LuTriangleAlert className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {error}
          </span>
        </div>
      )}

      {!isConnected && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="w-full"
        >
          {isRetrying ? (
            <>
              <LuRefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <LuRefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export const ConnectionStatusCompact: React.FC<
  ConnectionStatusCompactProps
> = ({ isConnected, error, onRetry, isRetrying = false, className }) => {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {isConnected ? (
        <Badge
          variant="outline"
          className="text-xs flex items-center space-x-1"
        >
          <LuWifi className="h-3 w-3" />
          <span>Online</span>
        </Badge>
      ) : (
        <div className="flex items-center space-x-1">
          <Badge
            variant="destructive"
            className="text-xs flex items-center space-x-1"
          >
            <LuWifiOff className="h-3 w-3" />
            <span>Offline</span>
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-6 px-2 text-xs"
            title={error || "Retry connection"}
          >
            {isRetrying ? (
              <LuRefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <LuRefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
