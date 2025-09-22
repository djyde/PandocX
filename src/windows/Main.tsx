import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettings, useConvertDocument } from "../lib/query";
import { toast } from "sonner";

import { FileTextIcon, Loader2Icon, PlusIcon, SettingsIcon } from 'lucide-react'
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";



const OUTPUT_FORMATS = [
  // Lightweight markup formats
  { value: "markdown", label: "Markdown", category: "Lightweight Markup" },
  { value: "gfm", label: "GitHub-flavored Markdown", category: "Lightweight Markup" },
  { value: "commonmark", label: "CommonMark", category: "Lightweight Markup" },
  { value: "rst", label: "reStructuredText", category: "Lightweight Markup" },
  { value: "asciidoc", label: "AsciiDoc", category: "Lightweight Markup" },
  { value: "org", label: "Emacs Org-Mode", category: "Lightweight Markup" },
  { value: "muse", label: "Emacs Muse", category: "Lightweight Markup" },
  { value: "textile", label: "Textile", category: "Lightweight Markup" },
  { value: "markua", label: "Markua", category: "Lightweight Markup" },
  { value: "djot", label: "Djot", category: "Lightweight Markup" },
  
  // HTML formats
  { value: "html4", label: "HTML 4", category: "HTML" },
  { value: "html5", label: "HTML5", category: "HTML" },
  { value: "html", label: "HTML", category: "HTML" },
  { value: "chunkedhtml", label: "Chunked HTML", category: "HTML" },
  
  // Ebooks
  { value: "epub2", label: "EPUB v2", category: "Ebooks" },
  { value: "epub3", label: "EPUB v3", category: "Ebooks" },
  { value: "epub", label: "EPUB", category: "Ebooks" },
  { value: "fb2", label: "FictionBook2", category: "Ebooks" },
  
  // Documentation formats
  { value: "texinfo", label: "GNU TexInfo", category: "Documentation" },
  { value: "haddock", label: "Haddock markup", category: "Documentation" },
  
  // Roff formats
  { value: "man", label: "roff man", category: "Roff" },
  { value: "ms", label: "roff ms", category: "Roff" },
  
  // TeX formats
  { value: "latex", label: "LaTeX", category: "TeX" },
  { value: "context", label: "ConTeXt", category: "TeX" },
  
  // XML formats
  { value: "docbook4", label: "DocBook v4", category: "XML" },
  { value: "docbook5", label: "DocBook v5", category: "XML" },
  { value: "docbook", label: "DocBook", category: "XML" },
  { value: "jats", label: "JATS", category: "XML" },
  { value: "tei", label: "TEI Simple", category: "XML" },
  { value: "opendocument", label: "OpenDocument XML", category: "XML" },
  
  // Outline formats
  { value: "opml", label: "OPML", category: "Outline" },
  
  // Bibliography formats
  { value: "bibtex", label: "BibTeX", category: "Bibliography" },
  { value: "biblatex", label: "BibLaTeX", category: "Bibliography" },
  { value: "csljson", label: "CSL JSON", category: "Bibliography" },
  { value: "cslyaml", label: "CSL YAML", category: "Bibliography" },
  
  // Word processor formats
  { value: "docx", label: "Microsoft Word (.docx)", category: "Word Processor" },
  { value: "rtf", label: "Rich Text Format (.rtf)", category: "Word Processor" },
  { value: "odt", label: "OpenOffice/LibreOffice (.odt)", category: "Word Processor" },
  
  // Interactive notebook formats
  { value: "ipynb", label: "Jupyter notebook (.ipynb)", category: "Notebook" },
  
  // Page layout formats
  { value: "icml", label: "InDesign ICML", category: "Page Layout" },
  { value: "typst", label: "Typst", category: "Page Layout" },
  
  // Wiki markup formats
  { value: "mediawiki", label: "MediaWiki markup", category: "Wiki" },
  { value: "dokuwiki", label: "DokuWiki markup", category: "Wiki" },
  { value: "xwiki", label: "XWiki markup", category: "Wiki" },
  { value: "zimwiki", label: "ZimWiki markup", category: "Wiki" },
  { value: "jira", label: "Jira wiki markup", category: "Wiki" },
  
  // Slide show formats
  { value: "beamer", label: "LaTeX Beamer", category: "Slides" },
  { value: "pptx", label: "Microsoft PowerPoint", category: "Slides" },
  { value: "slidy", label: "Slidy", category: "Slides" },
  { value: "revealjs", label: "reveal.js", category: "Slides" },
  { value: "slideous", label: "Slideous", category: "Slides" },
  { value: "s5", label: "S5", category: "Slides" },
  { value: "dzslides", label: "DZSlides", category: "Slides" },
  
  // Terminal output
  { value: "ansi", label: "ANSI-formatted text", category: "Terminal" },
  
  // Serialization formats
  { value: "native", label: "Haskell AST", category: "Serialization" },
  { value: "json", label: "JSON AST", category: "Serialization" },
  { value: "xml", label: "XML AST", category: "Serialization" },
  
  // Plain text
  { value: "plain", label: "Plain Text", category: "Text" },
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
              label: "Open Folder",
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
                      {format.value}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
