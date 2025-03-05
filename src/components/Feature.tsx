import React, { useEffect, useState } from 'react';
import Button from './Button';
import ReactMarkdown from 'react-markdown';
import { Collapse } from './Collapse';
import { AnimatePresence } from 'motion/react';

export const FeatureCard = ({
  feature,
  setFeatures,
  nodeCount,
}: {
  feature: Feature;
  setFeatures: React.Dispatch<React.SetStateAction<Feature[]>>;
  nodeCount: number;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    setConfirmDelete(true);
    setTimeout(() => {
      setConfirmDelete(false);
    }, 3000);
    if (confirmDelete) {
      setFeatures((state: Feature[]) =>
        state.filter((f) => f.id !== feature.id)
      );
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeatures((state) =>
      state.map((f) =>
        f.id === feature.id ? { ...f, title: e.target.value } : f
      )
    );
  };

  const handleHighEstimateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeatures((state) =>
      state.map((f) =>
        f.id === feature.id
          ? { ...f, highEstimate: parseInt(e.target.value) }
          : f
      )
    );
  };

  const handleLowEstimateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeatures((state) =>
      state.map((f) =>
        f.id === feature.id
          ? { ...f, lowEstimate: parseInt(e.target.value) }
          : f
      )
    );
  };

  const handleImageFocus = (nodeId: string) => {
    window.parent.postMessage(
      {
        pluginMessage: {
          type: 'FOCUS_NODE',
          nodeId: nodeId,
        },
      },
      '*'
    );
  };

  const handleTagNode = (target: 'image' | 'document') => {
    window.parent.postMessage(
      {
        pluginMessage: {
          type: 'GET_NODE_ID',
          featureId: feature.id,
          target,
        },
      },
      '*'
    );
  };

  const handleUntagTextNode = (id: string) => {
    setFeatures((state) =>
      state.map((f) =>
        f.id === feature.id
          ? { ...f, notes: f.notes.filter((n) => n.nodeId !== id) }
          : f
      )
    );
  };

  const handleImageDelete = (index: number) => {
    setFeatures((state) =>
      state.map((f) =>
        f.id === feature.id
          ? { ...f, images: f.images.filter((_, i) => i !== index) }
          : f
      )
    );
  };

  const handleRefreshNote = (nodeId: string) => {
    window.parent.postMessage(
      {
        pluginMessage: {
          type: 'GET_NOTE_CONTENT',
          nodeId: nodeId,	
        },
      },
      '*'
    );
  };

	// Automatically refresh notes when the feature is expanded.
	useEffect(() => {
		if (!isCollapsed) {
			feature.notes.forEach((note) => {
				handleRefreshNote(note.nodeId)
			})
		}
	}, [feature.notes, isCollapsed])

  return (
    <article className="feature shadow-sm rounded-md p-2">
      <AnimatePresence>
        <div
          key={feature.id + '-header'}
          className="flex flex-row gap-4 items-center justify-between h-12"
        >
          {isCollapsed ? (
            <h2 className="text-lg font-semibold">
              {feature.title.length > 0 ? (
                feature.title
              ) : (
                <span className="text-gray-500">[Untitled]</span>
              )}
            </h2>
          ) : (
            <input
              type="text"
              value={feature.title}
              onChange={handleTitleChange}
              placeholder="Feature Title"
              className="border-1 border-black p-2 border-r-0 border-t-0 border-l-0 text-lg font-semibold flex-1"
            />
          )}
          <div className="flex flex-row gap-4">
            <Button onClick={handleDelete} type="minus" color="warn">
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </Button>
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              type={isCollapsed ? 'plus' : 'minus'}
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </div>
        </div>
        <Collapse open={!isCollapsed} className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 w-full *:flex-1/2 mt-4 mb-4">
            <div className="flex flex-row gap-2 items-center">
              <label htmlFor="high-estimate" className="font-semibold">
                High Estimate
              </label>
              <input
                type="number"
                id="high-estimate"
                value={feature.highEstimate}
                onChange={handleHighEstimateChange}
                className="border-1 border-black p-2 flex-1 border-r-0 border-t-0 border-l-0"
              />
            </div>
            <div className="flex flex-row gap-2 items-center">
              <label htmlFor="low-estimate" className="font-semibold">
                Low Estimate
              </label>
              <input
                type="number"
                id="low-estimate"
                value={feature.lowEstimate}
                onChange={handleLowEstimateChange}
                className="border-1 border-black p-2 flex-1 border-r-0 border-t-0 border-l-0"
              />
            </div>
          </div>

          <div className="flex flex-row gap-4 w-full *:flex-1/2 ">
            {/* Text */}

            <div className="flex flex-col gap-2 bg-gray-100 rounded-md p-2">
              <div className="flex flex-col gap-2 w-full">
                {feature.notes.map((note, index) => (
                  <div key={`note-${index}`} className="flex flex-col gap-2">
                    <div className="flex flex-row gap-2 w-full justify-between">
                      <Button onClick={() => handleImageFocus(note.nodeId)}>
                        Go to Frame
                      </Button>
                      <Button
                        onClick={() => handleRefreshNote(note.nodeId)}
                      >
                        Refresh Content
                      </Button>
                      <Button
                        onClick={() => handleUntagTextNode(note.nodeId)}
                        type="minus"
                      >
                        Delete
                      </Button>
                    </div>
                    <div className="w-full">
                      <div className="markdown-preview w-full h-auto min-h-[20px] p-2 max-h-[200px] overflow-y-auto border-1 border-gray-200 rounded-md">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
							<Button onClick={() => handleTagNode('document')} type="plus">
								Tag Document Note
							</Button>
            </div>

            {/* Images */}
            <div className="flex flex-col gap-2 bg-gray-100 rounded-md p-2">
              <div className="flex flex-col gap-2 w-full">
                {feature.images.map((imgNode, index) => (
                  <div key={`img-${index}`} className="flex flex-col gap-2">
                    <div className="flex flex-row gap-2 w-full justify-between">
                      <Button onClick={() => handleImageFocus(imgNode.nodeId)}>
                        Go to Frame
                      </Button>
                      <Button
                        onClick={() => handleImageDelete(index)}
                        type="minus"
												disabled={nodeCount === 0}
                      >
                        Delete
                      </Button>
                    </div>
                    <iframe
                      src={imgNode.embedUrl}
                      className="w-full h-auto"
                    ></iframe>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => handleTagNode('image')}
                type="plus"
                disabled={nodeCount === 0}
              >
                Tag New Frame
              </Button>
            </div>
          </div>
        </Collapse>
      </AnimatePresence>
    </article>
  );
};
