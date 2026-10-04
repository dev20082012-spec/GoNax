"""
GoNax Scientific Evaluation & Residual Analysis Module
Evaluates candidate models strictly on held-out test data.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def evaluate_models(trained_models: dict, X_val: pd.DataFrame, y_val: pd.Series, X_test: pd.DataFrame, y_test: pd.Series):
    metrics = {}
    
    for name, item in trained_models.items():
        predict_fn = item['predict_fn']
        
        y_val_pred = predict_fn(X_val)
        y_test_pred = predict_fn(X_test)
        
        val_mae = float(mean_absolute_error(y_val, y_val_pred))
        val_rmse = float(np.sqrt(mean_squared_error(y_val, y_val_pred)))
        val_r2 = float(r2_score(y_val, y_val_pred))
        
        test_mae = float(mean_absolute_error(y_test, y_test_pred))
        test_rmse = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))
        test_r2 = float(r2_score(y_test, y_test_pred))
        
        # Test residual standard error (RSE) relative percentage
        residuals = y_test - y_test_pred
        rse = float(np.std(residuals, ddof=2))
        mean_y = float(np.mean(y_test))
        rse_pct = round((rse / mean_y) * 100.0, 2)
        
        metrics[name] = {
            'val_mae': round(val_mae, 4),
            'val_rmse': round(val_rmse, 4),
            'val_r2': round(val_r2, 4),
            'test_mae': round(test_mae, 4),
            'test_rmse': round(test_rmse, 4),
            'test_r2': round(test_r2, 4),
            'rse_percentage': rse_pct
        }
        
    return metrics
