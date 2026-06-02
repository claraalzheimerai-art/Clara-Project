-- ============================================================
-- CLARA — Database Schema (SQL Server)
-- Generado desde: src/models/, src/controllers/, src/services/
-- Motor: SQL Server 2019+
-- ============================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'clara_db')
  CREATE DATABASE clara_db;
GO

USE clara_db;
GO

-- ============================================================
-- Tabla: users
-- Fuente: src/models/user.model.ts
--
-- Operaciones mapeadas:
--   INSERT  → UserModel.create()                    (register)
--   SELECT  → UserModel.findByEmail()               (login, forgot-password, resend-verification)
--   SELECT  → UserModel.findById()                  (getMe, updateMe, changePassword, refreshToken)
--   SELECT  → UserModel.findByVerificationToken()   (verify-email)
--   SELECT  → UserModel.findByResetToken()          (reset-password — filtra reset_token_expiry > GETDATE())
--   UPDATE  → UserModel.update()                    (múltiples controladores, campos dinámicos)
--     · email_verified + verification_token  → verify-email
--     · verification_token                   → resend-verification
--     · reset_token + reset_token_expiry     → forgot-password
--     · password + reset_token + expiry null → reset-password
--     · password                             → changePassword
--     · nombre, apellido, especialidad,
--       institucion, telefono               → updateProfile (PATCH /me)
-- ============================================================

IF NOT EXISTS (
  SELECT * FROM sys.objects
  WHERE object_id = OBJECT_ID(N'users') AND type = N'U'
)
CREATE TABLE users (
  id                  INT             NOT NULL IDENTITY(1,1),
  nombre              NVARCHAR(100)   NOT NULL,
  apellido            NVARCHAR(100)   NOT NULL,
  email               NVARCHAR(255)   NOT NULL,
  password            NVARCHAR(255)   NOT NULL,            -- bcrypt hash, 12 rounds
  role                NVARCHAR(10)    NOT NULL DEFAULT 'medico',

  -- Verificación de correo
  email_verified      BIT             NOT NULL DEFAULT 0,
  verification_token  NVARCHAR(36)    NULL,                -- UUID v4, se anula tras uso

  -- Reset de contraseña
  reset_token         NVARCHAR(36)    NULL,                -- UUID v4, se anula tras uso
  reset_token_expiry  DATETIME        NULL,                -- expira 1 hora tras generación

  -- Perfil extendido (PATCH /me vía updateProfile)
  especialidad        NVARCHAR(100)   NULL,
  institucion         NVARCHAR(150)   NULL,
  telefono            NVARCHAR(30)    NULL,

  created_at          DATETIME        NOT NULL DEFAULT GETDATE(),
  updated_at          DATETIME        NOT NULL DEFAULT GETDATE(),

  CONSTRAINT PK_users              PRIMARY KEY (id),
  CONSTRAINT UQ_users_email        UNIQUE      (email),
  CONSTRAINT CK_users_role         CHECK       (role IN ('medico', 'admin'))
);
GO

CREATE INDEX IX_users_verification_token ON users (verification_token);
CREATE INDEX IX_users_reset_token        ON users (reset_token);
GO

-- ============================================================
-- Tabla: analysis_history
-- Fuente: src/services/history.service.ts  (actualmente en memoria)
--         src/models/analysis.model.ts     (EnrichedAnalysisResult)
--         src/controllers/upload.controller.ts
--         src/controllers/history.controller.ts
--
-- Operaciones mapeadas (pendiente migrar desde RAM):
--   INSERT  → historyService.save()        (POST /api/v1/analysis/upload)
--   SELECT  → historyService.findAll()     (GET  /api/v1/history)
--   SELECT  → historyService.findById()    (GET  /api/v1/history/:id)
--   SELECT  → historyService.getStats()    (GET  /api/v1/history/stats)
--   DELETE  → historyService.deleteById()  (DELETE /api/v1/history/:id)
--   DELETE  → historyService.clear()       (DELETE /api/v1/history)
-- ============================================================

IF NOT EXISTS (
  SELECT * FROM sys.objects
  WHERE object_id = OBJECT_ID(N'analysis_history') AND type = N'U'
)
CREATE TABLE analysis_history (
  id                    NVARCHAR(36)    NOT NULL,          -- UUID v4 (analysisId)
  user_id               INT             NULL,              -- FK → users.id

  -- Archivo subido
  filename              NVARCHAR(255)   NOT NULL,
  file_size             INT             NOT NULL,          -- tamaño en bytes

  -- Predicción del modelo IA
  prediction_label      NVARCHAR(3)     NOT NULL,          -- 'CN' | 'MCI' | 'AD'
  prediction_confidence DECIMAL(5,4)    NOT NULL,          -- 0.0000 – 1.0000
  probability_cn        DECIMAL(5,4)    NOT NULL,
  probability_mci       DECIMAL(5,4)    NOT NULL,
  probability_ad        DECIMAL(5,4)    NOT NULL,

  -- Imágenes (PNG en base64)
  gradcam               NVARCHAR(MAX)   NULL,              -- Grad-CAM overlay
  mri_image             NVARCHAR(MAX)   NULL,              -- slice MRI original

  -- Metadatos del resultado
  model_version         NVARCHAR(50)    NOT NULL,
  confidence_level      NVARCHAR(6)     NOT NULL,          -- 'HIGH' | 'MEDIUM' | 'LOW'
  diagnostic_label      NVARCHAR(100)   NOT NULL,          -- texto legible para el médico
  diagnostic_color      NVARCHAR(10)    NOT NULL,          -- hex color para UI
  requires_review       BIT             NOT NULL DEFAULT 0,
  analyzed_at           DATETIME        NOT NULL,

  CONSTRAINT PK_analysis_history   PRIMARY KEY (id),
  CONSTRAINT FK_ah_user            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT CK_ah_label           CHECK (prediction_label  IN ('CN', 'MCI', 'AD')),
  CONSTRAINT CK_ah_confidence      CHECK (confidence_level  IN ('HIGH', 'MEDIUM', 'LOW'))
);
GO

CREATE INDEX IX_ah_user_id         ON analysis_history (user_id);
CREATE INDEX IX_ah_analyzed_at     ON analysis_history (analyzed_at);
CREATE INDEX IX_ah_label           ON analysis_history (prediction_label);
CREATE INDEX IX_ah_requires_review ON analysis_history (requires_review);
GO

-- Migración: agregar mri_image si la tabla ya existía sin esa columna
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'analysis_history') AND name = 'mri_image'
)
  ALTER TABLE analysis_history ADD mri_image NVARCHAR(MAX) NULL;
GO
