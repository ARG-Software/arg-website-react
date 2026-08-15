import { useEffect, useRef, useState } from 'react';

function getWrappedIndex(index, length) {
  return ((index % length) + length) % length;
}

function getCaption(image) {
  return image?.caption ?? image?.cap ?? '';
}

function getImageSource(image) {
  return image?.thumb ?? image?.thumbSrc ?? image?.src ?? '';
}

function getImageSrcSet(image) {
  return image?.thumbSrcSet ?? image?.srcSet;
}

function GalleryImage({ image, index, onOpen }) {
  const caption = getCaption(image);
  const src = getImageSource(image);
  const srcSet = getImageSrcSet(image);
  const sizes = image?.sizes ?? '(max-width: 1023px) 50vw, 18vw';

  return (
    <button
      type="button"
      className="prp-image-gallery__shot"
      onClick={() => onOpen(index)}
      aria-label={`View ${caption || 'project image'}`}
    >
      {src ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={image?.alt ?? caption}
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
          width={image?.width}
          height={image?.height}
        />
      ) : (
        <span className="prp-image-gallery__placeholder">
          <span>{caption || 'Project image'}</span>
        </span>
      )}
    </button>
  );
}

export function ImageGallery({ images = [], className = '' }) {
  const [open, setOpen] = useState(-1);
  const closeButtonRef = useRef(null);
  const isOpen = open >= 0 && open < images.length;

  const show = index => {
    if (!images.length) return;
    setOpen(getWrappedIndex(index, images.length));
  };

  const close = () => setOpen(-1);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setOpen(-1);
      } else if (event.key === 'ArrowLeft') {
        setOpen(getWrappedIndex(open - 1, images.length));
      } else if (event.key === 'ArrowRight') {
        setOpen(getWrappedIndex(open + 1, images.length));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, isOpen, open]);

  if (!images.length) return null;

  const rootClassName = ['prp-image-gallery', className].filter(Boolean).join(' ');
  const openImage = isOpen ? images[open] : null;
  const openCaption = getCaption(openImage);

  return (
    <div className={rootClassName}>
      <div className="prp-image-gallery__mosaic" data-count={images.length}>
        {images.map((image, index) => (
          <GalleryImage
            key={image.src ?? image.thumb ?? index}
            image={image}
            kind="tile"
            index={index}
            onOpen={show}
          />
        ))}
      </div>

      {isOpen && (
        <div
          className="prp-image-gallery__lightbox is-open"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          data-lenis-prevent
          onClick={event => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="prp-image-gallery__lightbox-button prp-image-gallery__lightbox-close"
            onClick={close}
            aria-label="Close image viewer"
          >
            <svg
              className="prp-image-gallery__lightbox-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 5l14 14M19 5L5 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="prp-image-gallery__lightbox-button prp-image-gallery__lightbox-prev"
                onClick={() => show(open - 1)}
                aria-label="Previous image"
              >
                <svg
                  className="prp-image-gallery__lightbox-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M15 5l-7 7 7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="prp-image-gallery__lightbox-button prp-image-gallery__lightbox-next"
                onClick={() => show(open + 1)}
                aria-label="Next image"
              >
                <svg
                  className="prp-image-gallery__lightbox-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}

          <div className="prp-image-gallery__lightbox-stage">
            {openImage?.src ? (
              <img
                className="prp-image-gallery__lightbox-image"
                src={openImage.src}
                srcSet={openImage.srcSet}
                sizes="100vw"
                alt={openImage.alt ?? openCaption}
                width={openImage.width}
                height={openImage.height}
              />
            ) : (
              <div className="prp-image-gallery__lightbox-placeholder">
                {openCaption || 'Project image'}
              </div>
            )}
            <div className="prp-image-gallery__lightbox-caption">{openCaption}</div>
            <div className="prp-image-gallery__lightbox-count">
              {open + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
