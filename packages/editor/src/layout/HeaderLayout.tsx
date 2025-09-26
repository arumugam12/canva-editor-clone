import { forwardRef, ForwardRefRenderFunction, useCallback, useState } from 'react';
import { useEditor } from 'canva-editor/hooks';
import CanvaIcon from 'canva-editor/icons/CanvaIcon';
import EditInlineInput from 'canva-editor/components/EditInlineInput';
import SettingDivider from 'canva-editor/utils/settings/components/SettingDivider';
import EditorButton from 'canva-editor/components/EditorButton';
import NextIcon from 'canva-editor/icons/NextIcon';
import BackIcon from 'canva-editor/icons/BackIcon';
import SyncedIcon from 'canva-editor/icons/SyncedIcon';
import HeaderFileMenu from './sidebar/components/HeaderFileMenu';
import SyncingIcon from 'canva-editor/icons/SyncingIcon';
import useMobileDetect from 'canva-editor/hooks/useMobileDetect';
import styled from '@emotion/styled';
import ExportIcon from 'canva-editor/icons/ExportIcon';

const Button = styled('button')`
  display: flex;
  align-items: center;
  color: #fff;
  line-height: 1;
  background: rgb(255 255 255 / 7%);
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgb(255 255 255 / 15%);
  }
`;

interface HeaderLayoutProps {
  logoUrl?: string;
  designName: string;
  saving: boolean;
  onChanges: (str: string) => void;
}
const HeaderLayout: ForwardRefRenderFunction<
  HTMLDivElement,
  HeaderLayoutProps
> = ({ logoUrl, designName, saving, onChanges }, ref) => {
  const [name, setName] = useState(designName);
  const { actions, query, config } = useEditor((state, config) => ({ config }));
  
  const exportPNGViaAPI = useCallback(async () => {
    try {
      const pages = query.serialize();
      const response = await fetch(`${config.apis.url}/export/png`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, name }),
      });
      if (!response.ok) throw new Error('Failed to export PNG');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(name || 'design').replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export PNG via API failed');
    }
  }, [config?.apis?.url, name, query]);

  const exportJSONViaAPI = useCallback(async () => {
    try {
      const pages = query.serialize();
      const response = await fetch(`${config.apis.url}/template/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: name || 'design', pages }),
      });
      if (!response.ok) throw new Error('Failed to export JSON');
      // If server returns JSON data, download it as a file
      const json = await response.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(name || 'design').replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export JSON via API failed');
    }
  }, [config?.apis?.url, name, query]);
  const isMobile = useMobileDetect();
  return (
    <div
      ref={ref}
      css={{
        background: '#893a3a',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 31,
        '@media (max-width: 900px)': {
          padding: 12,
        },
      }}
    >
      {!isMobile && (
        <div
          css={{
            fontSize: 36,
          }}
        >
            <img
              src={logoUrl || '/logo.svg'}
              css={{
                height: 40,
              }}
            />
        </div>
      )}
      <div css={{ marginRight: 'auto' }}>
        <div css={{ margin: isMobile ? '0 16px 0 0' : '0 16px' }}>
          <HeaderFileMenu designName={name} />
        </div>
      </div>
      <div
        css={{ display: 'flex', alignItems: 'center', verticalAlign: 'middle' }}
      >
        <div css={{ display: 'flex', alignItems: 'center', columnGap: 15 }}>
          <EditInlineInput
            text={name}
            placeholder='Untitled design'
            autoRow={false}
            styles={{
              placeholderColor: 'hsla(0,0%,100%,.5)',
            }}
            onSetText={(newText) => {
              setName(newText);
              if (name !== newText) {
                onChanges(newText);
                actions.setName(newText);
              }
            }}
            handleStyle={(isFocus) => {
              return {
                color: '#fff',
                borderRadius: 6,
                padding: 8,
                minHeight: 18,
                minWidth: 18,
                border: `1px solid ${
                  isFocus ? 'hsla(0,0%,100%,.8)' : 'transparent'
                }`,
                ':hover': {
                  border: '1px solid hsla(0,0%,100%,.8)',
                },
              };
            }}
            inputCss={{
              borderBottomColor: 'transparent',
              backgroundColor: 'transparent',
            }}
          />
          <div css={{ color: 'hsla(0,0%,100%,.7)' }}>
            {saving ? <SyncingIcon /> : <SyncedIcon />}
          </div>
        </div>
        <div
          css={{
            margin: '0 16px',
          }}
        >
          <SettingDivider background='hsla(0,0%,100%,.15)' />
        </div>
        <div css={{ display: 'flex', columnGap: 15 }}>
          <EditorButton
            onClick={actions.history.undo}
            disabled={!query.history.canUndo()}
            styles={{
              disabledColor: 'hsla(0,0%,100%,.4)',
              color: '#fff',
            }}
            tooltip='Undo'
          >
            <BackIcon />
          </EditorButton>
          <EditorButton
            onClick={actions.history.redo}
            disabled={!query.history.canRedo()}
            styles={{
              disabledColor: 'hsla(0,0%,100%,.4)',
              color: '#fff',
            }}
            tooltip='Redo'
          >
            <NextIcon />
          </EditorButton>
        </div>
        {!isMobile && (
          <>
            <div
              css={{
                margin: '0 16px',
              }}
            >
              <SettingDivider background='hsla(0,0%,100%,.15)' />
            </div>
            <Button onClick={() => {
              actions.fireDownloadPNGCmd(0);
            }}>
                <div css={{ fontSize: 20 }}>
                  <ExportIcon />
                </div>{' '}
              <span css={{ marginRight: 4, marginLeft: 4 }}>Export</span>
              </Button>
            <div css={{ width: 8 }} />
            <Button onClick={exportJSONViaAPI}>
                <div css={{ fontSize: 20 }}>
                  <ExportIcon />
                </div>{' '}
              <span css={{ marginRight: 4, marginLeft: 4 }}>Export JSON</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default forwardRef(HeaderLayout);
