import React, { useState, useEffect } from "react";
import Button from "./components/Button";

import { FeatureCard } from "./components/Feature";

const App: React.FC = () => {
  const [appState, setAppState] = useState<App>({
    fileKey: "",
  });
  const [features, setFeatures] = useState<Feature[]>([]);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [csvContent, setCsvContent] = useState<string>("");

  const saveFeatures = () => {
    window.parent.postMessage(
      {
        pluginMessage: { type: "SAVE_FEATURES", features },
      },
      "*",
    );
  };

  const loadFeatures = () => {
    window.parent.postMessage(
      {
        pluginMessage: { type: "LOAD_FEATURES" },
      },
      "*",
    );
  };

  const generateCSV = async () => {
    // First, update all notes content
    const updatedFeatures = await Promise.all(
      features.map(async (feature) => {
        const updatedNotes = await Promise.all(
          feature.notes.map((note) => {
            return new Promise<typeof note>((resolve) => {
              const messageHandler = (event: MessageEvent) => {
                const message = event.data.pluginMessage;
                if (
                  message?.type === "POST_NOTE_CONTENT" &&
                  message.nodeId === note.nodeId
                ) {
                  window.removeEventListener("message", messageHandler);
                  resolve({
                    ...note,
                    content: message.content,
                  });
                }
              };

              window.addEventListener("message", messageHandler);

              window.parent.postMessage(
                {
                  pluginMessage: {
                    type: "GET_NOTE_CONTENT",
                    nodeId: note.nodeId,
                  },
                },
                "*",
              );
            });
          }),
        );

        return {
          ...feature,
          notes: updatedNotes,
        };
      }),
    );

    // Then generate CSV with updated content
    const headers = [
      "ID",
      "Title",
      "High Estimate",
      "Low Estimate",
      "Notes",
      "Notes Content",
      "Figma Frame Reference",
    ];

    const rows = updatedFeatures.map((feature) => [
      // ID
      feature.id,
      // Title
      feature.title,
      // High Estimate
      feature.highEstimate,
      // Low Estimate
      feature.lowEstimate,
      // Notes
      feature.notes.map((note) => note.embedUrl).join(" "),
      // Notes Content
      feature.notes.map((note) => note.content).join(" ").replace(/\n/g, " "),
      // Figma Frame Reference
      feature.images.map((img) => img.embedUrl).join(" "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    setCsvContent(csvContent);
  };

  const downloadCSV = async () => {
    await generateCSV();

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `features-${appState.fileKey}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateBlocksPage = () => {
    window.parent.postMessage(
      {
        pluginMessage: {
          type: "GENERATE_BLOCKS_PAGE",
          features: features,
        },
      },
      "*",
    );
  };

  /**
   * Get global app state.
   */
  useEffect(() => {
    if (appState.fileKey === "") {
      window.parent.postMessage(
        {
          pluginMessage: { type: "GET_APP_STATE" },
        },
        "*",
      );
    }
  }, [appState.fileKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message?.type) {
        return;
      }
      switch (message.type) {
        case "POST_APP_STATE":
          setAppState(message.appState);
          break;
        case "POST_NODE_COUNT":
          setNodeCount(message.count);
          break;
        case "POST_NODE_TAG":
          if (message.target === "image") {
            setFeatures((state) =>
              state.map((f) =>
                f.id === message.featureId
                  ? {
                      ...f,
                      title: f.title || message.nodeName,
                      images: [
                        ...(f.images || []),
                        {
                          nodeId: message.nodeId,
                          embedUrl: `https://embed.figma.com/design/${appState.fileKey}?node-id=${message.nodeId}&embed-host=share&footer=false&viewport-controls=false&page-selector=false`,
                        },
                      ],
                    }
                  : f,
              ),
            );
          } else if (message.target === "document") {
            setFeatures((state) =>
              state.map((f) =>
                f.id === message.featureId
                  ? {
                      ...f,
                      notes: [
                        ...(f.notes || []),
                        {
                          nodeId: message.nodeId,
                          embedUrl: `https://embed.figma.com/design/${appState.fileKey}?node-id=${message.nodeId}&embed-host=share&footer=false&viewport-controls=false&page-selector=false`,
                          content: message.content,
                        },
                      ],
                    }
                  : f,
              ),
            );
          }
          break;
        case "POST_TEXT":
          setFeatures((state) =>
            state.map((f) =>
              f.id === message.featureId ? { ...f, content: message.text } : f,
            ),
          );
          break;
        case "LOAD_FEATURES":
          setFeatures(message.features);
          break;
        case "POST_NOTE_CONTENT":
          setFeatures((state) =>
            state.map((f) => ({
              ...f,
              notes: f.notes.map((note) =>
                note.nodeId === message.nodeId
                  ? { ...note, content: message.content }
                  : note,
              ),
            })),
          );
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [appState]);

  return (
    <div className="w-full h-full flex flex-col gap-2 p-1 bg-gray-100 *:bg-white *:border-2 *:border-gray-200 *:rounded-md *:p-2">
      <div className="flex flex-row gap-2">
        <Button onClick={() => saveFeatures()}>Save Features</Button>
        <Button onClick={() => loadFeatures()}>Load Features</Button>
      </div>
      <div className="flex flex-row gap-2">
        <Button
          onClick={() => {
            generateCSV();
            downloadCSV();
          }}
          disabled={features.length === 0}
        >
          Download CSV
        </Button>
      </div>
      <div className="flex flex-row gap-2">
        <Button
          onClick={() => {
            generateBlocksPage();
          }}
          disabled={features.length === 0}
        >
          Generate Blocks/Features Page
        </Button>
      </div>
      {/* Features */}
      <section className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Features</h2>
          <Button
            onClick={() => {
              setFeatures((state) => [
                ...state,
                {
                  id: state.length,
                  title: "",
                  images: [],
                  notes: [],
                  highEstimate: 0,
                  lowEstimate: 0,
                },
              ]);
            }}
            type="plus"
          >
            Create Feature
          </Button>
        </div>
        {features.length !== 0 && (
          <div className="flex flex-col gap-2 w-full">
            {features
              .sort((a, b) => b.id - a.id)
              .map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  setFeatures={setFeatures}
                  nodeCount={nodeCount}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default App;
