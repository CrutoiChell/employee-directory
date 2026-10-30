import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import { SessionGate } from './Components/SessionGate/SessionGate';
import { Login } from './Routes/Login/Login';
import { Registration } from './Routes/Registration/Registration';
import { Employees } from './Routes/Employees/Employees';

const router = createBrowserRouter([
  {
    element: <SessionGate />,
    children: [
      { path: '/', element: <Employees /> },
      { path: '/employees', element: <Employees /> },
      { path: '/login', element: <Login /> },
      { path: '/registration', element: <Registration /> },
      {
        path: '*',
        element: (
          <main className="session-state">
            <h1>Страница не найдена</h1>
            <Link className="button button--primary" to="/employees">
              Открыть справочник
            </Link>
          </main>
        ),
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
