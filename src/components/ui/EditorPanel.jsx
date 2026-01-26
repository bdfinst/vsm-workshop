import PropTypes from 'prop-types'
import StepEditor from '../builder/StepEditor'
import ConnectionEditor from '../builder/ConnectionEditor'

function EditorPanel({
  selectedStepId,
  isEditing,
  selectedConnectionId,
  isEditingConnection,
  onCloseEditor,
  onCloseConnectionEditor,
}) {
  if (selectedStepId && isEditing) {
    return <StepEditor stepId={selectedStepId} onClose={onCloseEditor} />
  }

  if (selectedConnectionId && isEditingConnection) {
    return (
      <ConnectionEditor
        connectionId={selectedConnectionId}
        onClose={onCloseConnectionEditor}
      />
    )
  }

  return null
}

EditorPanel.propTypes = {
  selectedStepId: PropTypes.string,
  isEditing: PropTypes.bool.isRequired,
  selectedConnectionId: PropTypes.string,
  isEditingConnection: PropTypes.bool.isRequired,
  onCloseEditor: PropTypes.func.isRequired,
  onCloseConnectionEditor: PropTypes.func.isRequired,
}

EditorPanel.defaultProps = {
  selectedStepId: null,
  selectedConnectionId: null,
}

export default EditorPanel
