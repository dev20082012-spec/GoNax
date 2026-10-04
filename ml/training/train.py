"""
GoNax Model Training Module
Trains candidate allometric and machine learning models on held-out splits.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

def train_candidate_models(X_train: pd.DataFrame, y_train: pd.Series):
    """
    Trains 4 candidate models:
    1. Log-Allometric Power Law with Baskerville correction
    2. Multi-Feature Ridge Regressor (L2 regularized)
    3. Random Forest Regressor
    4. Gradient Boosting Regressor
    """
    trained = {}

    # 1. Log-Allometric Power Law (Log-Linear OLS)
    train_ln_x = np.log(X_train[['dbh_cm', 'height_m']].values)
    train_ln_y = np.log(y_train.values)
    allom_ols = LinearRegression().fit(train_ln_x, train_ln_y)
    train_resids = train_ln_y - allom_ols.predict(train_ln_x)
    s_squared = np.var(train_resids, ddof=2)
    baskerville_cf = float(np.exp(s_squared / 2.0))

    def predict_allom(X):
        ln_x = np.log(X[['dbh_cm', 'height_m']].values)
        return np.exp(allom_ols.predict(ln_x)) * baskerville_cf

    trained['allometric_power_law'] = {
        'model': allom_ols,
        'predict_fn': predict_allom,
        'baskerville_cf': baskerville_cf
    }

    # 2. Multi-Feature Ridge Regressor
    ridge = Ridge(alpha=1.0, random_state=42).fit(X_train, y_train)
    trained['multi_feature_ridge'] = {
        'model': ridge,
        'predict_fn': ridge.predict
    }

    # 3. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42).fit(X_train, y_train)
    trained['random_forest'] = {
        'model': rf,
        'predict_fn': rf.predict
    }

    # 4. Gradient Boosting Regressor
    gb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42).fit(X_train, y_train)
    trained['gradient_boosting'] = {
        'model': gb,
        'predict_fn': gb.predict
    }

    return trained
