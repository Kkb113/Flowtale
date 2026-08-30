import React, { useState, useEffect, useCallback, useRef, ReactElement } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $rootTextContent } from '@lexical/text';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { EditorState, LexicalEditor, $getRoot, $insertNodes, TextNode, LexicalNode, ParagraphNode } from 'lexical';
import { SaveOutlined, } from '@ant-design/icons';
import ToolbarPlugin from './plugins/toolbar-plugin';
import ImageUploadPlugin from './plugins/image-upload-plugin';
import Theme from './themes';
import AutoLinkPlugin from './plugins/auto-link-plugin';
import { ImageNode } from './nodes/image-node';
import { ExtendedTextNode } from './nodes/extended-text-node';
import { EditorBlurPlugin } from './plugins/editor-blur-plugin';
import LeadFormPlugin from './plugins/lead-form-plugin';
import { LeadFormNode } from './nodes/lead-form-node';
import { P_RespSubscription } from '../../entity-processor';
import { FeatureAvailability } from '../../types';
import { ExtendedLinkNode } from './nodes/extended-link-node';
import { ExtendedAutoLinkNode } from './nodes/extended-auto-link-node';
import './styles.css';

function Placeholder() : ReactElement {
  return <div className="editor-placeholder">Enter annotation text</div>;
}

const editorConfig = {
  namespace: 'fable-annotation-rich-text-editor',
  theme: Theme,
  onError(error: Error) {
    throw error;
  },
  nodes: [
    AutoLinkNode,
    ExtendedAutoLinkNode,
    LinkNode,
    ExtendedLinkNode,
    {
      replace: LinkNode,
      with: (node: LinkNode) => new ExtendedLinkNode(node.getURL()),
    },
    {
      replace: AutoLinkNode,
      with: (node: AutoLinkNode) => new ExtendedAutoLinkNode(node.getURL()),
    },
    ImageNode,
    LeadFormNode,
    ExtendedTextNode,
    { replace: TextNode, with: (node: TextNode) => new ExtendedTextNode(node.__text, node.__key) },
  ]
};

interface Props {
  lfPkf: string;
  defaultValue: string;
  throttledChangeHandler: (bodyContent: string, displayText: string) => void;
  leadFormFeatureAvailable: FeatureAvailability;
  subs: P_RespSubscription | null;
  updatePrimaryKey: (primaryKey: string) => void;
  warnings?: string[]
}

interface PluginProps {
  defaultAnnotationValue: string
}

function PopulateEditorWithAnnotationBodyPlugin({ defaultAnnotationValue }: PluginProps) : null {
  const [editor] = useLexicalComposerContext();

  const convertHTMLtoLexicalNodes = useCallback(() => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(defaultAnnotationValue, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    $getRoot().select();
    $insertNodes(nodes);
  }, [editor]);

  useEffect(() => {
    editor.update(() => {
      convertHTMLtoLexicalNodes();
    });
  }, []);

  return null;
}

interface AnnotationContent {
  htmlFromNode: string;
  annotationDisplayText: string;
}

export default function AnnotationRichTextEditor(props: React.PropsWithChildren<Props>): ReactElement {
  const annotationContentRef = useRef<AnnotationContent>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const timer = useRef(0);

  const modalControls = {
    showModal: () => {
      setIsModalOpen(true);
    },

    handleOk: () => {
      setIsModalOpen(false);
    },

    handleCancel: () => {
      setIsModalOpen(false);
    },
  };

  const onChangePluginHandler = (editorState: EditorState, editor: LexicalEditor) : void => {
    editorState.read(() => {
      const htmlFromNode = $generateHtmlFromNodes(editor);
      const annotationDisplayText = $rootTextContent();
      setSavingInProgress(true);
      annotationContentRef.current = { htmlFromNode, annotationDisplayText };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        props.throttledChangeHandler(htmlFromNode, annotationDisplayText);
        clearTimeout(timer.current);
        timer.current = 0;
        setSavingInProgress(false);
      }, 750) as unknown as number;
    });
  };

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="editor-container">
        <ToolbarPlugin
          modalControls={modalControls}
          leadFormFeatureAvailable={props.leadFormFeatureAvailable}
          subs={props.subs}
          warnings={props.warnings}
        />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={<Placeholder />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={onChangePluginHandler} />
          <AutoFocusPlugin />
          <LinkPlugin />
          <LeadFormPlugin
            lfPkf={props.lfPkf}
            updatePrimaryKey={props.updatePrimaryKey}
          />
          <AutoLinkPlugin />
          <ImageUploadPlugin isModalOpen={isModalOpen} modalControls={modalControls} />
          <PopulateEditorWithAnnotationBodyPlugin defaultAnnotationValue={props.defaultValue} />
          <EditorBlurPlugin updatedText={props.defaultValue} />
          <div style={{
            display: 'flex',
            justifyContent: 'end',
            padding: '0 0.5rem 0.25rem 0',
            animation: savingInProgress ? 'blink 2s linear infinite' : 'none',
            visibility: savingInProgress ? 'visible' : 'hidden'
          }}
          >
            <SaveOutlined style={{ fontSize: '0.75rem' }} />
          </div>
        </div>
      </div>
    </LexicalComposer>
  );
}
