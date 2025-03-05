// Read the docs https://plugma.dev/docs

export default function () {
  figma.showUI(__html__, { width: 800, height: 1200, themeColors: true });

  figma.ui.onmessage = (message) => {
    switch (message.type) {
      case "GET_APP_STATE":
        getAppState();
        break;
      case "GET_NODE_ID":
        exportSelection(message.featureId, message.target);
        break;
      case "SAVE_FEATURES":
        saveFeaturesToDocument(message.features);
        break;
      case "LOAD_FEATURES":
        loadFeaturesFromDocument();
        break;
      case "FOCUS_NODE":
        focusNode(message.nodeId);
        break;
      case "GET_NOTE_CONTENT":
        getNoteContent(message.nodeId);
        break;
      case "GENERATE_BLOCKS_PAGE":
        generateBlocksPage(message.features);
        break;
      default:
        break;
    }
  };
  figma.on("selectionchange", postNodeCount);
}

/**
 * Get the app state.
 */
const getAppState = () => {
  figma.ui.postMessage({
    type: "POST_APP_STATE",
    appState: { fileKey: figma.fileKey },
  });
};

/**
 * Post the node count to the UI.
 */
const postNodeCount = () => {
  const nodeCount = figma.currentPage.selection.length;

  figma.ui.postMessage({
    type: "POST_NODE_COUNT",
    count: nodeCount,
  });
};

/**
 * Focus on a node.
 */
const focusNode = (nodeId: string) => {
  const node = figma.getNodeById(nodeId);
  if (node) {
    figma.viewport.scrollAndZoomIntoView([node]);
  }
};

/**
 * Events.
 */
const exportSelection = async (
  featureId: number,
  target: "image" | "document",
) => {
  const selectedNode = figma.currentPage.selection[0];

  let content = "";
  if (target === "document") {
    content = await extractTextById(selectedNode.id);
  }

  figma.ui.postMessage({
    type: "POST_NODE_TAG",
    nodeId: selectedNode.id,
    nodeName: selectedNode.name,
    featureId,
    target,
    content,
  });
};

const walkNode = (node: SceneNode | BaseNode, text = "") => {
  let result = text;

  if (node.type === "TEXT") {
    if (typeof node.fontWeight === "number" && node.fontWeight > 400) {
      result += "## " + node.characters + "\n";
    } else {
      result += "- " + node.characters.replace(/\n/g, " - ") + "\n";
    }
  }

  if ("children" in node) {
    for (const child of node.children) {
      result = walkNode(child, result);
    }
  }

  return result;
};

/**
 * Extract text from a node by id.
 */
const extractTextById = async (nodeId: string) => {
  const node = figma.getNodeById(nodeId);
  if (node) {
    return walkNode(node, "").trim();
  }
  return "";
};

const saveFeaturesToDocument = async (features: any) => {
  // Create a new page or find existing one
  let page = figma.root.findChild((node) => node.name === "figma-plugin-json");
  if (!page) {
    page = figma.createPage();
    page.name = "figma-plugin-json";
  }

  // Find or create the json frame
  let jsonFrame = page.findChild((node) => node.name === "json") as FrameNode;
  if (!jsonFrame) {
    jsonFrame = figma.createFrame();
    jsonFrame.name = "json";
    jsonFrame.x = 0;
    jsonFrame.y = 0;
    page.appendChild(jsonFrame);
  }

  // Find or create the images frame
  let imagesFrame = page.findChild(
    (node) => node.name === "images",
  ) as FrameNode;
  if (!imagesFrame) {
    imagesFrame = figma.createFrame();
    imagesFrame.name = "images";
    imagesFrame.x = jsonFrame.width + 100; // Position to the right of json frame
    imagesFrame.y = 0;
    page.appendChild(imagesFrame);
  }

  // Clear existing content in both frames
  jsonFrame.children.forEach((child) => child.remove());
  imagesFrame.children.forEach((child) => child.remove());

  // Process features (no need to create new image nodes since we're using references)
  const processedFeatures = features.map((feature: any) => {
    return {
      ...feature,
      images: feature.images, // Images array already contains node IDs
    };
  });

  // Create a text node with the JSON content
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const text = figma.createText();
  text.characters = JSON.stringify(processedFeatures, null, 2);

  // Position the text node within the frame
  text.x = 0;
  text.y = 0;

  // Add the text node to the frame
  jsonFrame.appendChild(text);

  // Resize frames to fit content
  jsonFrame.resize(text.width, text.height);
  if (imagesFrame.children.length > 0) {
    imagesFrame.layoutMode = "HORIZONTAL";
    imagesFrame.itemSpacing = 20;
    imagesFrame.paddingLeft = 20;
    imagesFrame.paddingRight = 20;
  }
};

const loadFeaturesFromDocument = async () => {
  const page = figma.root.findChild(
    (node) => node.name === "figma-plugin-json",
  );
  if (!page) {
    figma.ui.postMessage({
      type: "LOAD_FEATURES",
      features: [],
    });
    return;
  }

  const jsonFrame = page.findChild((node) => node.name === "json") as FrameNode;

  if (!jsonFrame || jsonFrame.children.length === 0) {
    figma.ui.postMessage({
      type: "LOAD_FEATURES",
      features: [],
    });
    return;
  }

  // Get the first text node in the frame
  const textNode = jsonFrame.children[0] as TextNode;
  try {
    const savedFeatures = JSON.parse(textNode.characters);

    // Process features to convert node IDs back to image bytes
    const hydratedFeatures = await Promise.all(
      savedFeatures.map(async (feature: any) => {
        return {
          ...feature,
          images: feature.images, // Keep the node IDs as is
        };
      }),
    );

    figma.ui.postMessage({
      type: "LOAD_FEATURES",
      features: hydratedFeatures,
    });
  } catch (error) {
    console.error("Error parsing saved features:", error);
    figma.ui.postMessage({
      type: "LOAD_FEATURES",
      features: [],
    });
  }
};

const getNoteContent = async (nodeId: string) => {
  const content = await extractTextById(nodeId);
  figma.ui.postMessage({
    type: "POST_NOTE_CONTENT",
    nodeId,
    content,
  });
};

const generateBlocksPage = async (features: any[]) => {
  // Create a new page or find existing one
  let page = figma.root.findChild(
    (node) => node.name === "Components [Generated]",
  );
  if (page) {
    // Clear existing page if it exists
    page.children.forEach((child) => child.remove());
  } else {
    page = figma.createPage();
    page.name = "Components [Generated]";
  }

  // Load font for text nodes
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  let yPosition = 0;
  const padding = 50;

  // Process each feature
  for (const feature of features) {
    // Create a frame for this feature
    const featureFrame = figma.createFrame();
    featureFrame.name = `Feature: ${feature.title || "Untitled"}`;
    featureFrame.x = 0;
    featureFrame.y = yPosition;
    featureFrame.layoutMode = "VERTICAL";
    featureFrame.counterAxisSizingMode = "AUTO"; // Auto-width based on content
    featureFrame.itemSpacing = 20;
    featureFrame.paddingLeft = 40;
    featureFrame.paddingRight = 40;
    featureFrame.paddingTop = 40;
    featureFrame.paddingBottom = 40;
    featureFrame.fills = [
      { type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98 } },
    ];
    featureFrame.cornerRadius = 8;
    page.appendChild(featureFrame);

    // Create title text
    const titleText = figma.createText();
    titleText.characters = feature.title || "Untitled Feature";
    titleText.fontSize = 24;
    titleText.fontName = { family: "Inter", style: "Bold" };
    featureFrame.appendChild(titleText);

    // Create container for content
    const contentFrame = figma.createFrame();
    contentFrame.name = "Content";
    contentFrame.layoutMode = "HORIZONTAL";
    contentFrame.counterAxisSizingMode = "AUTO"; // Auto-height based on content
    contentFrame.primaryAxisSizingMode = "AUTO"; // Auto-width based on content
    contentFrame.itemSpacing = 40;
    contentFrame.fills = [];
    featureFrame.appendChild(contentFrame);

    // Create container frames with appropriate sizing
    let imagesFrame, notesFrame;

    // Calculate estimated space needed for images and notes
    const hasImages = feature.images && feature.images.length > 0;
    const hasNotes = feature.notes && feature.notes.length > 0;

    // Create notes frame first (to be on the left)
    if (hasNotes) {
      notesFrame = figma.createFrame();
      notesFrame.name = "Notes";
      notesFrame.layoutMode = "VERTICAL";
      notesFrame.counterAxisSizingMode = "AUTO"; // Auto-width
      notesFrame.primaryAxisSizingMode = "AUTO"; // Auto-height
      notesFrame.itemSpacing = 20;
      notesFrame.fills = [];
      contentFrame.appendChild(notesFrame);
    }

    // Create images frame second (to be on the right)
    if (hasImages) {
      imagesFrame = figma.createFrame();
      imagesFrame.name = "Images";
      imagesFrame.layoutMode = "VERTICAL";
      imagesFrame.counterAxisSizingMode = "AUTO"; // Auto-width
      imagesFrame.primaryAxisSizingMode = "AUTO"; // Auto-height
      imagesFrame.itemSpacing = 20;
      imagesFrame.fills = [];
      contentFrame.appendChild(imagesFrame);
    }

    // Add images (without resizing)
    if (hasImages && imagesFrame) {
      for (const img of feature.images) {
        const node = figma.getNodeById(img.nodeId);
        if (node) {
          const clone = node.clone();

          // Add frame around the clone for padding
          const frameContainer = figma.createFrame();
          frameContainer.name = "Image Container";
          frameContainer.layoutMode = "VERTICAL";
          frameContainer.counterAxisSizingMode = "AUTO";
          frameContainer.primaryAxisSizingMode = "AUTO";
          frameContainer.paddingLeft = 16;
          frameContainer.paddingRight = 16;
          frameContainer.paddingTop = 16;
          frameContainer.paddingBottom = 16;
          frameContainer.fills = [
            { type: "SOLID", color: { r: 1, g: 1, b: 1 } },
          ];
          frameContainer.cornerRadius = 4;
          frameContainer.appendChild(clone);
          imagesFrame.appendChild(frameContainer);
        }
      }
    }

    // Add notes (without resizing)
    if (hasNotes && notesFrame) {
      for (const note of feature.notes) {
        const noteFrame = figma.createFrame();
        noteFrame.name = "Note";
        noteFrame.layoutMode = "VERTICAL";
        noteFrame.counterAxisSizingMode = "AUTO";
        noteFrame.primaryAxisSizingMode = "AUTO";
        noteFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        noteFrame.cornerRadius = 4;
        noteFrame.paddingLeft = 16;
        noteFrame.paddingRight = 16;
        noteFrame.paddingTop = 16;
        noteFrame.paddingBottom = 16;
        noteFrame.itemSpacing = 16;
        notesFrame.appendChild(noteFrame);

        // Get original node for reference
        const originalNode = figma.getNodeById(note.nodeId);
        if (originalNode) {
          const clone = originalNode.clone();
          noteFrame.appendChild(clone);
        }
      }
    }

    // Update yPosition for next feature
    yPosition = featureFrame.y + featureFrame.height + padding;
  }

  // Focus the page
  figma.currentPage = page;
  figma.notify("Components page generated!");
};
