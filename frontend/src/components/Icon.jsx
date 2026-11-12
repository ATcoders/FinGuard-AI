const PATHS = {
  dashboard: <><path d="M3 4h7v7H3zM14 4h7v4h-7zM14 12h7v8h-7zM3 15h7v5H3z" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.200 6 5.500" /><path d="M16 5.200a3 3 0 0 1 0 5.600M18 14.800c2 .6 3.500 2.300 3.500 5.200" /></>,
  building: <><path d="M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3" /></>,
  logout: <><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" /></>,
  trash: <><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></>,
  mark: <><path d="M8 5v14M8 6h9M8 12h6" /></>,
};

export default function Icon({ name, size = 18, stroke = 1.7 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
