import {
    useParams
} from "react-router-dom";

import EventForm from "../../../components/admin/EventForm.jsx";

const AdminEventEdit = () => {
    const {
        id
    } = useParams();

    return (
        <EventForm
            mode="edit"
            eventId={id}
        />
    );
};

export default AdminEventEdit;
