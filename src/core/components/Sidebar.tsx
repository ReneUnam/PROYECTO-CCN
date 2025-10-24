import { NavLink } from 'react-router-dom';

export function Sidebar() {
  const links = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Perfil', path: '/profile' },
  ];

  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4">
      <nav className="flex flex-col space-y-2">
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                isActive ? 'bg-gray-300 dark:bg-gray-700 font-bold' : ''
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
