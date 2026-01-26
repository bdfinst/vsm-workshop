import PropTypes from 'prop-types'
import { SimulationResults } from '../simulation/SimulationResults'
import { ScenarioComparison } from '../simulation/ScenarioComparison'

function SimulationPanel({
  simulationResults,
  simulationScenarios,
  comparisonResults,
}) {
  return (
    <>
      {simulationResults && <SimulationResults />}
      {(simulationScenarios.length > 0 || comparisonResults) && (
        <ScenarioComparison />
      )}
    </>
  )
}

SimulationPanel.propTypes = {
  simulationResults: PropTypes.object,
  simulationScenarios: PropTypes.array,
  comparisonResults: PropTypes.object,
}

SimulationPanel.defaultProps = {
  simulationResults: null,
  simulationScenarios: [],
  comparisonResults: null,
}

export default SimulationPanel
