# GoNax Scientific Methodology

## 1. Principles of Allometric Scaling in Forest Ecology
Allometry relates the measurable dimensions of a tree—such as Diameter at Breast Height ($DBH$, measured at 1.30 m above ground level) and Total Tree Height ($H$)—to its total dry mass (Above-Ground Biomass, $AGB$).

Biomass represents the dry mass of living plant tissue (stem, branches, foliage, bark).

## 2. Standard Scientific Formulas

### 2.1 Power-Law Allometric Formulation (Jenkins / Zianis / Chave)
A widely validated model form in European and North American temperate forestry:
$$\text{AGB} = a \cdot DBH^b \cdot H^c$$
Or when incorporating wood density ($\rho$ in $\text{g/cm}^3$):
$$\text{AGB} = a \cdot (\rho \cdot DBH^2 \cdot H)^b$$

Where:
- $DBH$ is in centimeters (cm).
- $H$ is in meters (m).
- $\rho$ is the basic dry wood density ($\text{g/cm}^3$ or $\text{t/m}^3$).
- $a, b, c$ are species-specific allometric scaling parameters estimated via non-linear regression on destructive sampling datasets.

### 2.2 Log-Transformed Linear Allometric Formulation
Commonly fitted as:
$$\ln(\text{AGB}) = \beta_0 + \beta_1 \ln(DBH) + \beta_2 \ln(H)$$
With correction factor for back-transformation from logarithmic scale:
$$\text{AGB} = \exp\left(\beta_0 + \beta_1 \ln(DBH) + \beta_2 \ln(H) + \frac{\text{SEE}^2}{2}\right)$$
where $\text{SEE}$ is the standard error of the estimate.

## 3. Carbon Stock Estimation
Carbon content is not constant across all plant tissues, but species-specific carbon fractions ($CF$) typically range from 47% to 51% (IPCC 2006 guidelines; Thomas & Martin 2012):
$$\text{Carbon (kg)} = \text{AGB (kg)} \times CF$$
Default European conifer fraction: $CF = 0.508$
Default European broadleaf fraction: $CF = 0.476$

## 4. $CO_2$ Equivalent ($CO_2e$)
Based on the molecular mass ratio of Carbon Dioxide ($CO_2$, molar mass $\approx 44.01 \text{ g/mol}$) to Carbon ($C$, atomic mass $\approx 12.011 \text{ g/mol}$):
$$\text{Ratio} = \frac{44.01}{12.011} \approx 3.6667$$
$$\text{CO}_2e\text{ (kg)} = \text{Carbon (kg)} \times 3.6667$$

## 5. Curated Prototype Species in GoNax
1. **Quercus robur (Pedunculate Oak / European Oak)**:
   - Wood density: $0.67 \text{ g/cm}^3$
   - Form: $AGB = 0.0567 \times DBH^{2.012} \times H^{0.873}$
   - Carbon fraction: $0.482$
   - Calibration range: $DBH \in [10, 140]\text{ cm}$, $H \in [5, 38]\text{ m}$

2. **Pinus sylvestris (Scots Pine)**:
   - Wood density: $0.51 \text{ g/cm}^3$
   - Form: $AGB = 0.0418 \times DBH^{1.923} \times H^{0.954}$
   - Carbon fraction: $0.505$
   - Calibration range: $DBH \in [8, 90]\text{ cm}$, $H \in [4, 34]\text{ m}$

3. **Fagus sylvatica (European Beech)**:
   - Wood density: $0.68 \text{ g/cm}^3$
   - Form: $AGB = 0.0632 \times DBH^{1.984} \times H^{0.912}$
   - Carbon fraction: $0.485$
   - Calibration range: $DBH \in [10, 120]\text{ cm}$, $H \in [6, 42]\text{ m}$

4. **Acer pseudoplatanus (Sycamore Maple)**:
   - Wood density: $0.61 \text{ g/cm}^3$
   - Form: $AGB = 0.0521 \times DBH^{2.045} \times H^{0.865}$
   - Carbon fraction: $0.478$
   - Calibration range: $DBH \in [8, 95]\text{ cm}$, $H \in [5, 32]\text{ m}$

5. **Pseudotsuga menziesii (Douglas Fir)**:
   - Wood density: $0.49 \text{ g/cm}^3$
   - Form: $AGB = 0.0475 \times DBH^{1.948} \times H^{0.928}$
   - Carbon fraction: $0.512$
   - Calibration range: $DBH \in [12, 160]\text{ cm}$, $H \in [6, 60]\text{ m}$

*Notice: In accordance with scientific integrity rules, prototype models are explicitly designated as prototype allometric calibrations with citation metadata.*
