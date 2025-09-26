import { ChangeEvent, FC, useCallback, useRef, useState } from 'react';
import { useEditor } from 'canva-editor/hooks';
import CloseSidebarButton from './CloseButton';
import Button from 'canva-editor/components/button/Button';
import useMobileDetect from 'canva-editor/hooks/useMobileDetect';

interface UploadContentProps {
  visibility: boolean;
  onClose: () => void;
}
const UploadContent: FC<UploadContentProps> = ({ visibility, onClose }) => {
  const inputImageRef = useRef<HTMLInputElement>(null);
  const inputJsonRef = useRef<HTMLInputElement>(null);
  const { actions, activePage, config } = useEditor((state, config) => ({
    activePage: state.activePage,
    config,
  }));
  const isMobile = useMobileDetect();

  const [images, setImages] = useState<
    { url: string; type: 'svg' | 'image' }[]
  >([]);
  const addImage = async (url: string) => {
    const img = new Image();
    img.onerror = (err) => window.alert(err);
    img.src = url;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      actions.addImageLayer(
        { url, thumb: url },
        { width: img.naturalWidth, height: img.naturalHeight }
      );
      if (isMobile) {
        onClose();
      }
    };
  };
  const handleUploadImage = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${config.apis.url}/upload/image`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload image failed');
      const result = await res.json();
      const url = result.url as string;
      const width = result.width as number | undefined;
      const height = result.height as number | undefined;
      // Add to local preview grid
      setImages((prev) => prev.concat([{ url, type: 'image' }]));
      // Add to editor
      if (url) {
        if (width && height) {
          actions.addImageLayer({ url, thumb: url }, { width, height });
        } else {
          // Fallback: load to get dimensions
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () =>
            actions.addImageLayer(
              { url, thumb: url },
              { width: img.naturalWidth, height: img.naturalHeight }
            );
          img.src = url;
        }
        if (isMobile) onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Upload PNG via API failed');
    } finally {
      e.target.value = '';
    }
  }, [actions, config?.apis?.url, isMobile, onClose]);

  const handleUploadTemplateJson = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${config.apis.url}/template/import-file`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload template JSON failed');
      const result = await res.json();
      const template = result.template || result;
      const pages = template.pages || [];
      if (Array.isArray(pages) && pages.length > 0) {
        pages.forEach((page: any, index: number) => {
          actions.setPage(activePage + index, page);
        });
        if (isMobile) onClose();
      } else {
        alert('No pages found in uploaded template');
      }
    } catch (err) {
      console.error(err);
      alert('Upload JSON via API failed');
    } finally {
      e.target.value = '';
    }
  }, [actions, activePage, config?.apis?.url, isMobile, onClose]);
  return (
    <div
      css={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        overflowY: 'auto',
        display: visibility ? 'flex' : 'none',
      }}
    >
      {!isMobile && <CloseSidebarButton onClose={onClose} />}
      <div
        css={{
          margin: 16,
        }}
      >
        <div css={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button css={{ width: '100%' }} onClick={() => inputImageRef.current?.click()}>
            Upload PNG
          </Button>
          <Button css={{ width: '100%' }} onClick={() => inputJsonRef.current?.click()}>
            Upload JSON
          </Button>
        </div>
      </div>
      <input
        ref={inputImageRef}
        type={'file'}
        accept='image/*'
        css={{ display: 'none' }}
        onChange={handleUploadImage}
      />
      <input
        ref={inputJsonRef}
        type={'file'}
        accept='.json,application/json'
        css={{ display: 'none' }}
        onChange={handleUploadTemplateJson}
      />
      <div css={{ padding: '16px' }}>
        <div
          css={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gridGap: 8,
          }}
        >
          {images.map((item, idx) => (
            <div
              key={idx}
              css={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => addImage(item.url)}
            >
              <div css={{ paddingBottom: '100%', height: 0 }} />
              <div
                css={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={item.url}
                  loading='lazy'
                  css={{ maxHeight: '100%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UploadContent;
