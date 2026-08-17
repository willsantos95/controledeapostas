# SPEC-APOSTAS-02-AUTH
## Autenticação & Autorização

**Data**: Agosto 2026  
**Versão**: 1.0  
**Depende de**: SPEC-APOSTAS-01-CORE.md

---

## 1. VISÃO GERAL

- **MVP**: Autenticação pessoal (1 email/password por usuario)
- **v2+**: Multitenant com roles (owner, admin, user)
- **Persistência**: JWT com refresh token
- **Futuro**: OAuth (Google, GitHub)

---

## 2. SIGNUP / ONBOARDING

### 2.1 Fluxo de Signup

```
POST /auth/signup
├─ Body:
│  ├─ email (required, unique)
│  ├─ password (required, min 8 chars)
│  └─ full_name (optional)
├─ Validação:
│  ├─ Email válido (regex ou email-validator lib)
│  ├─ Password: min 8, 1 upper, 1 lower, 1 number
│  └─ Email not exists
├─ Ações:
│  ├─ Hash password com bcrypt (rounds: 12)
│  ├─ Criar tenant default (MVP)
│  ├─ Criar user com tenant_id
│  ├─ Gerar JWT access_token + refresh_token
│  └─ Retornar tokens + user data
└─ Response:
   ├─ access_token (JWT, 15min expiry)
   ├─ refresh_token (HTTPOnly cookie, 7 dias)
   └─ user { id, email, full_name }
```

### 2.2 Validação de Email

**Opcional (MVP)**: Email verification link via email pode sair na v2.

```sql
-- Tabela: email_verifications (v2)
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP
);
```

---

## 3. LOGIN

### 3.1 Fluxo de Login

```
POST /auth/login
├─ Body:
│  ├─ email (required)
│  └─ password (required)
├─ Validação:
│  ├─ User exists
│  ├─ Password matches (bcrypt.compare)
│  └─ User is_active = true
├─ Ações:
│  ├─ Update last_login
│  ├─ Gerar novo access_token + refresh_token
│  └─ Retornar user + tenant info
└─ Response:
   ├─ access_token (JWT, 15min)
   ├─ refresh_token (HTTPOnly cookie, 7 dias)
   └─ user { id, email, full_name, tenant_id }
```

### 3.2 Tratamento de Erro

```
❌ Email não existe → "Email ou senha incorretos" (não revelar)
❌ Senha errada → "Email ou senha incorretos"
❌ User não ativo → "Conta desativada. Contate suporte"
```

---

## 4. TOKENS & JWT

### 4.1 JWT Structure

```typescript
// Access Token (15 minutos)
{
  sub: user_id,
  email: user.email,
  tenant_id: user.tenant_id,
  role: 'user' | 'admin' | 'owner',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 15 * 60
}

// Refresh Token (7 dias)
{
  sub: user_id,
  type: 'refresh',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
}
```

### 4.2 Geração & Assinatura

```javascript
// .env
JWT_SECRET=<long-random-key-min-32-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

// utils/jwt.ts
import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    throw new Error('Invalid token');
  }
};
```

---

## 5. REFRESH TOKEN ROTATION

### 5.1 Fluxo

```
GET /auth/refresh
├─ Headers: Cookie(refresh_token)
├─ Validação:
│  ├─ Token válido e não expirado
│  └─ User ainda existe e is_active
├─ Ações:
│  ├─ Gerar novo access_token
│  ├─ (Opcional) Gerar novo refresh_token
│  └─ Atualizar cookie HTTPOnly
└─ Response:
   ├─ access_token (novo)
   └─ (se rotacionou) refresh_token (novo cookie)
```

### 5.2 Cookie Config

```typescript
// Backend: Quando gerar refresh token
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,        // Não acessível via JS
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
  path: '/auth'
});
```

---

## 6. LOGOUT

### 6.1 Fluxo

```
POST /auth/logout
├─ Headers: Authorization (JWT)
├─ Ações:
│  ├─ Invalidar refresh token (opcional: blacklist em Redis)
│  └─ Limpar cookie
└─ Response: { success: true }
```

### 6.2 Blacklist de Tokens (Opcional)

```typescript
// Redis entry (se crítico)
// key: refresh_token_hash
// ttl: 7 dias
// Ao logout, adicionar refresh token ao blacklist
```

---

## 7. MIDDLEWARE DE AUTENTICAÇÃO

### 7.1 Verificação de Token

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenant_id: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded as any;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
```

### 7.2 Aplicação nas Rotas

```typescript
// routes/bets.ts
import { authMiddleware } from '../middleware/auth';

router.get('/bets', authMiddleware, (req, res) => {
  // req.user.id, req.user.tenant_id disponíveis
  // Filtrar apostas apenas deste user
});
```

---

## 8. SEGURANÇA

### 8.1 Password Hashing

```typescript
import bcrypt from 'bcrypt';

// Hash na criação/update
export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 12);
};

// Comparação no login
export const comparePassword = async (plain: string, hashed: string) => {
  return await bcrypt.compare(plain, hashed);
};
```

### 8.2 Rate Limiting

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente depois.',
  standardHeaders: true,
  legacyHeaders: false
});

// Na rota de login
router.post('/login', loginLimiter, loginHandler);
```

### 8.3 CORS & CSRF

```typescript
// app.ts
import cors from 'cors';
import csrf from 'csurf';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true // Permitir cookies
}));

// CSRF token (se necessário)
app.use(csrf({ cookie: false })); // Usar JWT ao invés
```

---

## 9. FRONTEND: INTEGRAÇÃO

### 9.1 Login Flow (React + TypeScript)

```typescript
// hooks/useAuth.ts
import { useState } from 'react';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true // Enviar cookies
});

// Adicionar token a cada request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automático se token expirou
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { data } = await API.post('/auth/refresh');
        localStorage.setItem('access_token', data.access_token);
        
        // Retry original request
        return API.request(error.config);
      } catch {
        // Redirecionar pro login
        window.location.href = '/login';
      }
    }
    throw error;
  }
);

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('access_token', data.access_token);
      setUser(data.user);
    } catch (error) {
      throw new Error('Login falhou');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/signup', { email, password, full_name: fullName });
      localStorage.setItem('access_token', data.access_token);
      setUser(data.user);
    } catch (error) {
      throw new Error('Signup falhou');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
    }
  };

  return {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user
  };
};
```

### 9.2 Protected Route (React)

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  element: React.ReactNode;
}

export const ProtectedRoute = ({ element }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;
  
  return isAuthenticated ? <>{element}</> : <Navigate to="/login" />;
};

// App.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
</Routes>
```

---

## 10. MULTITENANT (v2+)

### 10.1 Tenant Creation

```typescript
// Ao signup, criar tenant default
const createDefaultTenant = async (userId: string) => {
  const tenant = await db.query(
    `INSERT INTO tenants (name, subscription_tier)
     VALUES ($1, $2)
     RETURNING *`,
    [`Tenant de ${user.email}`, 'free']
  );
  
  // Associar user ao tenant
  await db.query(
    `UPDATE users SET tenant_id = $1 WHERE id = $2`,
    [tenant.id, userId]
  );
};
```

### 10.2 Tenant Isolation (Middleware)

```typescript
// middleware/tenantIsolation.ts
export const tenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Adicionar tenant_id ao contexto
  req.tenantId = req.user.tenant_id;
  
  next();
};

// Usar em queries
const getUserBets = async (userId: string, tenantId: string) => {
  return await db.query(
    `SELECT * FROM bets 
     WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );
};
```

---

## 11. ENDPOINTS RESUMO

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/auth/signup` | ❌ | Registrar novo user |
| POST | `/auth/login` | ❌ | Fazer login |
| POST | `/auth/logout` | ✅ | Logout |
| GET | `/auth/refresh` | ❌ | Renovar access token |
| GET | `/auth/me` | ✅ | Dados do user autenticado |
| PUT | `/auth/password` | ✅ | Mudar senha |

---

## 12. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Database: users + tenants tables
- [ ] Password hashing: bcrypt setup
- [ ] JWT: geração + verificação
- [ ] Signup endpoint com validação
- [ ] Login endpoint com rate limiting
- [ ] Refresh token endpoint
- [ ] Auth middleware
- [ ] Frontend: login/signup form
- [ ] Frontend: Protected routes
- [ ] Testes: auth flow end-to-end
- [ ] Deploy: JWT_SECRET em .env produção

---

**Próxima Spec**: SPEC-APOSTAS-03-BETS.md (CRUD de apostas + uploads)
