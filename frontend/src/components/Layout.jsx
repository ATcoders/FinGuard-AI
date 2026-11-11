import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../utils/format';
import Icon from './Icon';

const VIEW_ORG = ['admin', 'finance', 'director', 'cfo'];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" style={{ color: 'var(--brass)' }}><Icon name="mark" size={18} stroke={2} /></div>
      <div className="brand-name">Fin<em>Guard</em></div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const canViewOrg = VIEW_ORG.includes(user.role);

  return (
    <div className="app">
      <div className="mobilebar">
        <button onClick={() => setOpen(true)} aria-label="Open navigation"><Icon name="menu" size={22} /></button>
        <div className="brand-name" style={{ fontSize: 20 }}>Fin<em>Guard</em></div>
      </div>
      <div className={`scrim-nav${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <Brand />
        <nav className="nav" aria-label="Main">
          <div className="nav-heading">Overview</div>
          <NavLink to="/" end className="nav-link"><Icon name="dashboard" /> Dashboard</NavLink>

          {canViewOrg && (
            <>
              <div className="nav-heading">Organisation</div>
              <NavLink to="/employees" className="nav-link"><Icon name="users" /> Employees</NavLink>
              <NavLink to="/organisation" className="nav-link"><Icon name="building" /> Departments</NavLink>
            </>
          )}
        </nav>

        <div className="me">
          <div>
            <div className="me-name">{user.full_name}</div>
            <div className="me-meta">{ROLE_LABEL[user.role]} · {user.company_name}</div>
          </div>
          <button className="btn btn-sm" onClick={logout}><Icon name="logout" size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="main"><Outlet /></main>
    </div>
  );
}
