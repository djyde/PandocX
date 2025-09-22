import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettings, useConvertDocument } from "../lib/query";
import { StatusBar } from "@/components/StatusBar";

import { FileTextIcon, Loader2Icon, PlusIcon, SettingsIcon } from 'lucide-react'
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";



const OUTPUT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word Document (.docx)" },
  { value: "html", label: "HTML" },
  { value: "md", label: "Markdown" },
  { value: "txt", label: "Plain Text" },
  { value: "epub", label: "EPUB" },
  { value: "odt", label: "OpenDocument Text" },
  { value: "rtf", label: "Rich Text Format" },
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


export function MainWindow() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const convertMutation = useConvertDocument();
  const pandocPath = settings?.pandocPath || null;

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
    if (!selectedFile || !pandocPath) return;

    convertMutation.mutate({
      pandocPath,
      inputPath: selectedFile,
      outputFormat: outputFormat,
    });
  };

  const fileName = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.split("/").pop() || selectedFile;
  }, [selectedFile]);

  const fileExtension = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.split(".").pop() || "";
  }, [selectedFile]);

  if (settingsLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!pandocPath) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Pandoc Not Configured</h3>
          <p className="text-yellow-700 mb-4">
            Please configure the pandoc path in the Settings tab before using the converter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>

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
              <div onClick={_ => {
                handleFileSelect();
              }} role="button" className="w-18 h-18 border-primary border-2 border-dashed flex items-center justify-center rounded-lg hover:border-primary/80 transition-all duration-100">
                <PlusIcon />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Support formats: {inputExtensions.join(", ")}
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
                      {format.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <StatusBar />
      </div>
    </>
  );
}
