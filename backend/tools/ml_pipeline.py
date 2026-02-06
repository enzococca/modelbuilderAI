"""Machine learning pipeline tool using scikit-learn."""

from __future__ import annotations

import io
import json
import os
import pickle
from pathlib import Path
from typing import Any

from tools import BaseTool

MODELS_DIR = Path("data/models")


class MLPipelineTool(BaseTool):
    """Train, predict, and evaluate ML models from CSV data."""

    name = "ml_pipeline"
    description = "Train ML models from CSV data, make predictions, and evaluate performance (scikit-learn)"

    async def execute(self, input_text: str, **kwargs: Any) -> str:
        operation = kwargs.get("operation", "train")

        if operation == "train":
            return self._train(input_text, **kwargs)
        if operation == "predict":
            return self._predict(input_text, **kwargs)
        if operation == "evaluate":
            return self._evaluate(input_text, **kwargs)
        if operation == "list_models":
            return self._list_models()

        return f"Unknown operation: {operation}. Use train, predict, evaluate, or list_models."

    def _train(self, input_text: str, **kwargs: Any) -> str:
        """Train a model from CSV data."""
        try:
            import pandas as pd
            import numpy as np
            from sklearn.model_selection import train_test_split
        except ImportError:
            return "scikit-learn and pandas are required. Install with: pip install scikit-learn pandas"

        model_type = kwargs.get("model_type", "random_forest")
        target_column = kwargs.get("target_column", "")
        model_name = kwargs.get("model_name", "model")
        test_size = float(kwargs.get("test_size", 0.2))

        # Parse CSV from input
        try:
            df = pd.read_csv(io.StringIO(input_text))
        except Exception:
            # Try loading from file path
            path = Path(input_text.strip())
            if path.exists():
                df = pd.read_csv(path)
            else:
                return "Could not parse input as CSV. Provide CSV text or a file path."

        if not target_column:
            target_column = df.columns[-1]

        if target_column not in df.columns:
            return f"Target column '{target_column}' not found. Columns: {list(df.columns)}"

        # Separate features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # Auto-encode categorical columns
        for col in X.select_dtypes(include=['object', 'category']).columns:
            X[col] = X[col].astype('category').cat.codes

        # Determine task type
        is_classification = y.dtype == 'object' or y.nunique() < 20

        if is_classification:
            y_encoded = y.astype('category').cat.codes if y.dtype == 'object' else y
        else:
            y_encoded = y

        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=test_size, random_state=42,
        )

        # Create model
        model = self._create_model(model_type, is_classification)
        model.fit(X_train, y_train)

        # Evaluate
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)

        # Save model
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        model_path = MODELS_DIR / f"{model_name}.pkl"
        meta = {
            "model_type": model_type,
            "task": "classification" if is_classification else "regression",
            "features": list(X.columns),
            "target": target_column,
            "train_score": round(train_score, 4),
            "test_score": round(test_score, 4),
            "n_samples": len(df),
        }
        with open(model_path, "wb") as f:
            pickle.dump({"model": model, "meta": meta}, f)

        lines = [
            f"Model trained successfully: **{model_name}**",
            f"- Type: {model_type} ({'classification' if is_classification else 'regression'})",
            f"- Features: {len(X.columns)} columns",
            f"- Samples: {len(df)} ({len(X_train)} train / {len(X_test)} test)",
            f"- Train score: {train_score:.4f}",
            f"- Test score: {test_score:.4f}",
            f"- Saved to: {model_path}",
        ]

        # Feature importance if available
        if hasattr(model, 'feature_importances_'):
            importances = sorted(
                zip(X.columns, model.feature_importances_),
                key=lambda x: x[1], reverse=True,
            )[:10]
            lines.append("\nTop features:")
            for feat, imp in importances:
                lines.append(f"  - {feat}: {imp:.4f}")

        return "\n".join(lines)

    def _predict(self, input_text: str, **kwargs: Any) -> str:
        """Make predictions with a saved model."""
        try:
            import pandas as pd
        except ImportError:
            return "pandas is required."

        model_name = kwargs.get("model_name", "model")
        model_path = MODELS_DIR / f"{model_name}.pkl"

        if not model_path.exists():
            return f"Model '{model_name}' not found. Available: {self._list_model_names()}"

        with open(model_path, "rb") as f:
            bundle = pickle.load(f)

        model = bundle["model"]
        meta = bundle["meta"]

        try:
            df = pd.read_csv(io.StringIO(input_text))
        except Exception:
            path = Path(input_text.strip())
            if path.exists():
                df = pd.read_csv(path)
            else:
                return "Could not parse input as CSV."

        # Ensure same features
        for col in df.select_dtypes(include=['object', 'category']).columns:
            df[col] = df[col].astype('category').cat.codes

        missing = set(meta["features"]) - set(df.columns)
        if missing:
            return f"Missing columns: {missing}"

        X = df[meta["features"]]
        predictions = model.predict(X)

        results = df.copy()
        results["prediction"] = predictions

        output = results.to_string(index=False, max_rows=50)
        return f"Predictions ({len(predictions)} rows):\n\n{output}"

    def _evaluate(self, input_text: str, **kwargs: Any) -> str:
        """Evaluate a model against labeled data."""
        try:
            import pandas as pd
            from sklearn.metrics import classification_report, mean_squared_error, r2_score
        except ImportError:
            return "scikit-learn and pandas are required."

        model_name = kwargs.get("model_name", "model")
        model_path = MODELS_DIR / f"{model_name}.pkl"

        if not model_path.exists():
            return f"Model '{model_name}' not found."

        with open(model_path, "rb") as f:
            bundle = pickle.load(f)

        model = bundle["model"]
        meta = bundle["meta"]

        try:
            df = pd.read_csv(io.StringIO(input_text))
        except Exception:
            path = Path(input_text.strip())
            if path.exists():
                df = pd.read_csv(path)
            else:
                return "Could not parse input as CSV."

        target = meta["target"]
        if target not in df.columns:
            return f"Target column '{target}' not found."

        for col in df.select_dtypes(include=['object', 'category']).columns:
            if col != target:
                df[col] = df[col].astype('category').cat.codes

        X = df[meta["features"]]
        y = df[target]
        if y.dtype == 'object':
            y = y.astype('category').cat.codes

        predictions = model.predict(X)

        if meta["task"] == "classification":
            report = classification_report(y, predictions)
            return f"Classification Report for '{model_name}':\n\n{report}"
        else:
            mse = mean_squared_error(y, predictions)
            r2 = r2_score(y, predictions)
            return f"Regression Metrics for '{model_name}':\n- MSE: {mse:.4f}\n- R²: {r2:.4f}"

    def _list_models(self) -> str:
        """List all saved models."""
        if not MODELS_DIR.exists():
            return "No models saved yet."
        models = list(MODELS_DIR.glob("*.pkl"))
        if not models:
            return "No models saved yet."
        lines = ["Saved models:"]
        for mp in models:
            try:
                with open(mp, "rb") as f:
                    bundle = pickle.load(f)
                meta = bundle["meta"]
                lines.append(f"- **{mp.stem}**: {meta['model_type']} ({meta['task']}) — test score: {meta['test_score']:.4f}")
            except Exception:
                lines.append(f"- **{mp.stem}**: (corrupted)")
        return "\n".join(lines)

    def _list_model_names(self) -> str:
        if not MODELS_DIR.exists():
            return "none"
        return ", ".join(p.stem for p in MODELS_DIR.glob("*.pkl")) or "none"

    def _create_model(self, model_type: str, is_classification: bool):
        """Create a scikit-learn model instance."""
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
        from sklearn.linear_model import LogisticRegression, LinearRegression
        from sklearn.svm import SVC, SVR
        from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor

        models = {
            "random_forest": (RandomForestClassifier, RandomForestRegressor),
            "gradient_boosting": (GradientBoostingClassifier, GradientBoostingRegressor),
            "linear": (LogisticRegression, LinearRegression),
            "svm": (SVC, SVR),
            "knn": (KNeighborsClassifier, KNeighborsRegressor),
        }

        pair = models.get(model_type, models["random_forest"])
        cls = pair[0] if is_classification else pair[1]
        return cls(random_state=42) if 'random_state' in cls().get_params() else cls()
