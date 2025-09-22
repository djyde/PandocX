import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAtomValue, useSetAtom } from "jotai";
import { logsAtom, isExpandedAtom, toggleExpandedAtom } from "@/lib/store";

export function StatusBar() {
  const logs = useAtomValue(logsAtom);
  const isExpanded = useAtomValue(isExpandedAtom);
  const toggleExpanded = useSetAtom(toggleExpandedAtom);

  if (logs.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-200 border-t border-gray-700 z-50"
      >
        {!isExpanded ? (
          // Collapsed status bar - show latest log entry
          <div className="px-4 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-xs font-medium font-mono truncate max-w-96">
                  {logs[logs.length - 1]?.message || "Processing..."}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={toggleExpanded}
                >
                  <span className="text-xs">Details</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Expanded full-screen log viewer
          <motion.div
            initial={{ height: "auto" }}
            animate={{ height: "100vh" }}
            exit={{ height: "auto" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-screen flex flex-col"
          >
            <LogViewer />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function LogViewer() {
  const logs = useAtomValue(logsAtom);
  const toggleExpanded = useSetAtom(toggleExpandedAtom);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      case 'info':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-end px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="text-gray-300 hover:text-white hover:bg-gray-800 inline-flex items-center gap-1 h-7 px-2"
          >
            <span className="text-xs">Close</span>
            <XIcon className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-1 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No logs yet. Start a conversion to see detailed logs here.
          </div>
        ) : (
          logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="py-0.5"
            >
              <div className="flex items-start gap-3">
                <span className="text-gray-600 text-xs shrink-0 mt-0.5 w-20">
                  {formatTimestamp(log.timestamp)}
                </span>
                <div className="flex-1">
                  {log.message.startsWith('$ ') ? (
                    // Command line - style it like a terminal prompt
                    <div className="text-green-400">
                      <span className="text-gray-500">➜</span> <span className="text-blue-400">pandocx</span> {log.message.substring(2)}
                    </div>
                  ) : (
                    // Regular output - style based on level
                    <div className={`${getLevelColor(log.level)} whitespace-pre-wrap break-words leading-relaxed`}>
                      {log.message}
                    </div>
                  )}
                </div>
              </div>
              {log.details && (
                <div className="mt-1 ml-24 text-gray-400 text-sm bg-gray-900 rounded p-3 border border-gray-700">
                  <pre className="whitespace-pre-wrap break-words leading-relaxed">{log.details}</pre>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
