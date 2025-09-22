import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { usePandocPath, useConvertDocument } from "../lib/query";
import { toast } from "sonner";
import { PandocDownloadDialog } from "@/components/PandocDownloadDialog";

import { ExternalLinkIcon, FileTextIcon, FolderOpenIcon, Loader2Icon, PlusIcon, SettingsIcon } from 'lucide-react'
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";



const OUTPUT_FORMATS = [
  { value: "html", label: "HTML", category: "Web" },
  { value: "md", label: "Markdown", category: "Markup" },
  { value: "txt", label: "Plain Text", category: "Markup" },
  { value: "docx", label: "Microsoft Word (.docx)", category: "Word Processor" },
  { value: "epub", label: "EPUB ebook", category: "Web" },
  { value: "latex", label: "LaTeX source", category: "Print" },
  { value: "rtf", label: "Rich Text Format (.rtf)", category: "Word Processor" },
  { value: "xml", label: "XML version of native AST", category: "Other" },
  { value: "csv", label: "CSV table", category: "Other" },
  { value: "asciidoc", label: "AsciiDoc", category: "Markup" },

  // Web Formats
  { value: "slidy", label: "Slidy HTML slideshow", category: "Web" },
  { value: "slideous", label: "Slideous HTML slideshow", category: "Web" },
  { value: "dzslides", label: "DZSlides HTML slideshow", category: "Web" },
  { value: "s5", label: "S5 HTML slideshow", category: "Web" },
  { value: "odt", label: "OpenDocument Text (.odt)", category: "Word Processor" },
  // Print and Document Formats
  { value: "beamer", label: "LaTeX Beamer slideshow", category: "Print" },
  { value: "context", label: "ConTeXt", category: "Print" },
  { value: "man", label: "roff man page", category: "Print" },
  { value: "docbook", label: "DocBook XML", category: "Print" },
  { value: "typst", label: "Typst markup", category: "Print" },

  // Markup and Other Formats
  { value: "commonmark_x", label: "CommonMark with extensions", category: "Markup" },
  { value: "rst", label: "reStructuredText", category: "Markup" },
  { value: "mediawiki", label: "MediaWiki markup", category: "Markup" },
  { value: "org", label: "Emacs Org-Mode", category: "Markup" },
  { value: "json", label: "JSON version of native AST", category: "Other" },
  { value: "ipynb", label: "Jupyter notebook", category: "Other" },
  { value: "tsv", label: "TSV table", category: "Other" },
];

const inputExtensions = [
  // Lightweight markup formats (↔︎ or ←)
  "md", "markdown", "txt", "rst", "org", "muse", "textile", "t2t", "djot",
  // HTML formats (↔︎)
  "html", "htm", "xhtml",
  // Ebooks (↔︎)
  "epub", "fb2",
  // Documentation formats (↔︎ or ←)
  "pod", "haddock",
  // Roff formats (↔︎ or ←)
  "man", "mdoc",
  // TeX formats (↔︎)
  "tex", "latex",
  // XML formats (↔︎ or ←)
  "xml", "docbook", "jats", "bits",
  // Outline formats (↔︎)
  "opml",
  // Bibliography formats (↔︎ or ←)
  "bib", "bibtex", "json", "yaml", "yml", "ris", "enl",
  // Word processor formats (↔︎)
  "docx", "rtf", "odt",
  // Interactive notebook formats (↔︎)
  "ipynb",
  // Page layout formats (↔︎)
  "typ", "typst",
  // Wiki markup formats (↔︎ or ←)
  "wiki", "mediawiki", "dokuwiki", "tikiwiki", "twiki", "vimwiki", "jira", "creole",
  // Data formats (←)
  "csv", "tsv"
]


const useOnDragDropEvent = (onFileDrop: (filePath: string) => void, acceptedExtensions: string[]) => {
  const listenedRef = useRef(false);

  const [isDragOver, setIsDragOver] = useState(false);

  const validateFilePath = useCallback((filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension && acceptedExtensions.includes(extension);
  }, [acceptedExtensions]);

  useQuery({
    queryKey: ["on-drag-drop-event", "main"],
    queryFn: async () => {
      console.log("on-drag-drop-event", "main");
      if (listenedRef.current) {
        return {
          unlisten: () => { },
        };
      }
      listenedRef.current = true;
      const webview = await getCurrentWebview();
      console.log("webview", webview);
      const unlisten = webview.onDragDropEvent((event) => {
        const payload = event.payload;

        if (payload.type === 'enter' || payload.type === 'over') {
          setIsDragOver(true);
        } else if (payload.type === 'drop') {
          setIsDragOver(false);

          if (payload.paths && payload.paths.length > 0) {
            const filePath = payload.paths[0];

            if (!validateFilePath(filePath)) {
              const extension = filePath.split('.').pop()?.toLowerCase();
              toast.error(`Unsupported file format "${extension}". Supported formats: ${acceptedExtensions.join(', ')}`);
              return;
            }

            onFileDrop(filePath);
          }
        } else if (payload.type === 'leave') {
          setIsDragOver(false);
        }
      });

      return {
        unlisten,
      }
    },
    throwOnError: true,
    retry: false,
  })

  return {
    isDragOver,
  }
}



export function MainWindow() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const { data: pandocPath, isLoading: pandocLoading, refetch: refetchPandocPath } = usePandocPath();
  const convertMutation = useConvertDocument();

  // Initialize Tauri drag and drop
  const { isDragOver } = useOnDragDropEvent(
    (filePath: string) => {
      setSelectedFile(filePath);
    },
    inputExtensions
  );

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Document Files",
            extensions: inputExtensions
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
      }
    } catch (error) {
      console.error("Failed to select file:", error);
    }
  };

  const handleConvert = async (outputFormat: string) => {
    if (!selectedFile) return;

    // Check if pandoc is available, if not trigger download
    if (!pandocPath) {
      setShowDownloadDialog(true);
      return;
    }

    // Show loading toast
    const toastId = toast.loading("Converting...");

    convertMutation.mutate({
      pandocPath,
      inputPath: selectedFile,
      outputFormat: outputFormat,
    }, {
      onSuccess: (result) => {
        toast.dismiss(toastId);
        if (result.success && result.output_path) {
          toast.success("Conversion completed!", {
            duration: Infinity,
            action: {
              label: <div className="flex items-center gap-1">
                <FolderOpenIcon size={12} />
                Open in folder
              </div>,
              onClick: () => {
                invoke("open_in_finder", { path: result.output_path });
              }
            }
          });
        } else {
          toast.error(result.error || "Conversion failed", {
            // action: {
            //   label: "See Logs",
            //   onClick: () => {
            //     invoke("open_settings_window");
            //   }
            // }
          });
        }
      },
      onError: (error) => {
        toast.dismiss(toastId);
        toast.error(`Conversion failed: ${error.message}`, {
          action: {
            label: "See Logs",
            onClick: () => {
              invoke("open_settings_window");
            }
          }
        });
      }
    });
  };

  const handleDownloadSuccess = () => {
    setShowDownloadDialog(false);
    refetchPandocPath();
    toast.success("Pandoc installed successfully!");
  };

  const fileName = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.split("/").pop() || selectedFile;
  }, [selectedFile]);

  const fileExtension = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.split(".").pop() || "";
  }, [selectedFile]);

  if (pandocLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-window drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-primary/20 z-50 flex items-center justify-center border-2 border-primary border-dashed">

        </div>
      )}

      <div className="h-screen flex items-center justify-center">
        <div className="fixed top-0 right-0 left-0 px-3">
          <div className="flex items-end justify-end">
            <Button onClick={_ => {
              invoke("open_settings_window");
            }} variant="ghost" size="sm" className="hover:bg-foreground/20 hover:text-foreground">
              <SettingsIcon />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 items-center">
          <Tooltip>
            <TooltipTrigger>
              <div
                onClick={_ => {
                  handleFileSelect();
                }}
                role="button"
                className="w-18 h-18 border-primary border-2 border-dashed flex items-center justify-center rounded-lg transition-all duration-200 hover:border-primary/80 hover:bg-primary/5"
              >
                <PlusIcon />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Click to select or drag & drop anywhere. Support formats: {inputExtensions.join(", ")}
            </TooltipContent>
          </Tooltip>

          {selectedFile && (
            <div>
              <div className="w-[300px] bg-primary/15 rounded-lg p-3 items-center flex gap-3 select-none ">
                {/* <div className="flex flex-col items-center justify-center gap-0.5 bg-green-800 rounded p-1.5">
                  <FileTextIcon className="text-primary" strokeWidth={1.5} />
                  <span className="text-xs">
                    {fileExtension}
                  </span>
                </div> */}
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <FileTextIcon className="text-primary" strokeWidth={1.5} />
                  <div className="text-xs text-primary">
                    {fileExtension}
                  </div>
                </div>
                <div>
                  <div className="text-xs line-clamp-2 break-all">
                    {fileName}
                  </div>

                </div>
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="flex flex-col gap-3 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={convertMutation.isPending}>
                    {convertMutation.isPending ? (
                      <>
                        <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                        Converting...
                      </>
                    ) : (
                      'Convert'
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {OUTPUT_FORMATS.map((format) => (
                    <DropdownMenuItem key={format.value} onClick={() => {
                      handleConvert(format.value);
                    }}>
                      {format.value}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <PandocDownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onSuccess={handleDownloadSuccess}
      />
    </>
  );
}
