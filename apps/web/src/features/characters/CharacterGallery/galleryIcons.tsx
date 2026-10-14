// Значки панели просмотрщика и плиток. Иконочной библиотеки в проекте нет, а этих
// значков всего несколько — рисуем сами, в размер кнопок @mantine/lightbox.
function Icon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export const IconThumbnails = () => (
  <Icon path="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
);
export const IconDownload = () => (
  <Icon path="M12 16l-6-6h4V4h4v6h4l-6 6zm-8 2h16v2H4v-2z" />
);
export const IconEnterFullscreen = () => (
  <Icon path="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm18 0v6h-6v-2h4v-4h2z" />
);
export const IconExitFullscreen = () => (
  <Icon path="M9 3v6H3V7h4V3h2zm6 0h2v4h4v2h-6V3zM3 15h6v6H7v-4H3v-2zm12 0h6v2h-4v4h-2v-6z" />
);
export const IconClose = () => (
  <Icon path="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
);
export const IconMore = () => (
  <Icon path="M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
);
