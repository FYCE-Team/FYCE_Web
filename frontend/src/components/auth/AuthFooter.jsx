import {
    Mail,
    Headphones
} from "lucide-react";

const AuthFooter = () => {
    return (
        <footer className="auth-footer">
            <div className="auth-footer-brand">
                Fantasy Youth Chamber
                <br />
                Ensemble
            </div>

            <div className="auth-footer-center">
                <div className="auth-footer-dot" />

                <span>
                    © 2024 FYCE. Dedicated to the
                    wonder of pastoral chamber
                    <br />
                    music.
                </span>
            </div>

            <div className="auth-footer-contact">
                <div>
                    <Headphones
                        size={16}
                    />

                    <span>
                        Rehearsal Helpline:
                    </span>

                    <strong>
                        (024) 3888–8888
                    </strong>
                </div>

                <div>
                    <Mail size={16} />

                    <span>
                        admissions@fyce.org
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default AuthFooter;