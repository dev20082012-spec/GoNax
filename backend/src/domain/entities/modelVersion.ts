export interface ModelVersionEntity {
  id: string;
  model_id: string;
  version: string;
  formula_expression: string;
  parameters_json: string;
  evaluation_metrics_json: string;
  is_active: boolean;
  is_prototype: boolean;
  created_at?: string;
}
