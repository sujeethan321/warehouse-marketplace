import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SpaceForm from '../../components/SpaceForm'
import { errMsg } from '../../services/api'
import { getSpace, updateSpace } from '../../services/spaceService'

export default function EditSpace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [space, setSpace] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSpace(id).then(setSpace).catch((e) => setError(errMsg(e)))
  }, [id])

  if (error) return <div className="alert error">{error}</div>
  if (!space) return <div className="spinner" />

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">{space.unique_code}</div>
          <h1>Edit {space.name}</h1>
        </div>
      </div>
      <SpaceForm
        initial={space}
        submitLabel="Save changes"
        onCancel={() => navigate('/owner/spaces')}
        onSubmit={async (data) => {
          await updateSpace(id, data)
          navigate('/owner/spaces')
        }}
      />
    </>
  )
}
